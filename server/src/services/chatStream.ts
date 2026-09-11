import type { Request, Response } from "express";
import { Chat, type ChatDoc, type MessageDoc, type PlainMessage } from "../models/Chat.js";
import type { UserDoc } from "../models/User.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { SseWriter } from "../utils/sse.js";
import { recordUsage } from "../middleware/quota.js";
import { badRequest } from "../utils/errors.js";
import { MEMORY, generateFollowUps, generateTitle, summarizeTurns } from "./ai.js";
import { buildRagPrompt, retrieveContext } from "./documents.js";
import { fetchImageAsBase64, imageUrl } from "./imagekit.js";
import { makeMessage, serializeMessage } from "./messages.js";
import { resolveModel } from "./providers/index.js";
import type { ChatProvider, ChatTurn, ModelInfo, Source, StreamEvent, ToolCallRecord, Usage } from "./providers/types.js";

export interface IncomingImage {
  filePath: string;
  mimeType?: string;
}

export interface GenerateOptions {
  model?: string | undefined;
  webSearch?: boolean | undefined;
  tools?: boolean | undefined;
  useDocuments?: boolean | undefined;
  documentIds?: string[] | undefined;
  temperature?: number | undefined;
  maxOutputTokens?: number | undefined;
}

export interface RunParams {
  chat: ChatDoc;
  user: UserDoc;
  /** Index of the user message in chat.messages that the model should answer. It must be the last message. */
  userMessageIndex: number;
  options: GenerateOptions;
  /** When true, generate a title after the exchange. */
  generateTitle?: boolean;
}

const DEFAULT_SYSTEM = `You are KOALA AI, a helpful, precise and friendly assistant. Format answers in Markdown: use headings sparingly, code blocks with a language tag, tables for tabular data and LaTeX ($...$ or $$...$$) for math. Answer in the user's language.`;
const MAX_IMAGES_PER_MESSAGE = 4;
const MIN_ANSWER_LENGTH_FOR_FOLLOW_UPS = 40;
const STOPPED_TEXT = "_Generation stopped._";
const EMPTY_TEXT = "_The model returned an empty response. Try rephrasing or adjusting the safety level._";

interface ResolvedOptions {
  provider: ChatProvider;
  model: ModelInfo;
  webSearch: boolean;
  tools: boolean;
  useDocuments: boolean;
  temperature: number;
  maxOutputTokens: number;
}

interface StreamResult {
  text: string;
  sources: Source[];
  toolCalls: ToolCallRecord[];
  usage: Usage;
  stopped: boolean;
}

function toTurn(m: Pick<MessageDoc, "role" | "text">, images?: Array<{ mimeType: string; data: string }>): ChatTurn {
  return { role: m.role, text: m.text, ...(images?.length ? { images } : {}) };
}

function resolveOptions(chat: ChatDoc, user: UserDoc, options: GenerateOptions): ResolvedOptions {
  const settings = user.settings;
  const { provider, model } = resolveModel(options.model ?? chat.model ?? settings.model);
  const webSearch = Boolean(options.webSearch ?? settings.webSearch) && model.supportsWebSearch;
  return {
    provider,
    model,
    webSearch,
    tools: Boolean(options.tools ?? settings.tools) && model.supportsTools && !webSearch,
    useDocuments: Boolean(options.useDocuments ?? settings.useDocuments),
    temperature: options.temperature ?? settings.temperature,
    maxOutputTokens: options.maxOutputTokens ?? settings.maxOutputTokens,
  };
}

/** Assembles the history sent to the model, applying rolling-summary memory for long chats. */
async function buildHistory(chat: ChatDoc, upToIndex: number): Promise<{ history: ChatTurn[]; summary: string; summarizedUpTo: number }> {
  const msgs = chat.messages.slice(0, upToIndex);
  let summary = chat.summary ?? "";
  let summarizedUpTo = Math.min(chat.summarizedUpTo ?? 0, msgs.length);

  const unsummarizedBeyondWindow = msgs.length - MEMORY.recentWindow - summarizedUpTo;
  if (unsummarizedBeyondWindow >= MEMORY.summarizeEvery) {
    const cutoff = msgs.length - MEMORY.recentWindow;
    summary = await summarizeTurns(summary, msgs.slice(summarizedUpTo, cutoff).map((m) => toTurn(m)));
    summarizedUpTo = cutoff;
  }

  // Older images are dropped from context to keep requests small; text stays.
  const recent = msgs.slice(Math.max(summarizedUpTo, msgs.length - MEMORY.recentWindow));
  return { history: recent.map((m) => toTurn(m)), summary, summarizedUpTo };
}

async function loadImages(images: IncomingImage[]): Promise<Array<{ mimeType: string; data: string }>> {
  const out: Array<{ mimeType: string; data: string }> = [];
  for (const img of images.slice(0, MAX_IMAGES_PER_MESSAGE)) {
    try {
      out.push(await fetchImageAsBase64(img.filePath, img.mimeType));
    } catch (err) {
      logger.warn({ err, filePath: img.filePath }, "Could not load image for the model");
    }
  }
  return out;
}

/** Retrieves document excerpts for the question and returns the prompt section plus source refs. */
async function documentContext(userId: string, question: string, documentIds: string[]): Promise<{ prompt: string; sources: Source[] }> {
  if (!question) return { prompt: "", sources: [] };
  const chunks = await retrieveContext(userId, question, { documentIds, topK: 6 });
  const seen = new Set<string>();
  const sources = chunks
    .filter((c) => (seen.has(c.documentId) ? false : (seen.add(c.documentId), true)))
    .map((c) => ({ title: c.documentName, uri: `document:${c.documentId}` }));
  return { prompt: buildRagPrompt(chunks), sources };
}

/** Consumes provider events, forwarding them over SSE and accumulating the final answer. */
async function consumeStream(events: AsyncGenerator<StreamEvent>, sse: SseWriter, initialSources: Source[]): Promise<StreamResult> {
  const result: StreamResult = { text: "", sources: [...initialSources], toolCalls: [], usage: { promptTokens: 0, candidateTokens: 0, totalTokens: 0 }, stopped: false };
  try {
    for await (const ev of events) {
      if (sse.isClosed) break;
      switch (ev.type) {
        case "text":
          result.text += ev.text;
          sse.send("chunk", { text: ev.text });
          break;
        case "sources":
          result.sources.push(...ev.sources);
          sse.send("sources", { sources: ev.sources });
          break;
        case "tool":
          result.toolCalls.push(ev.call);
          sse.send("tool", ev.call);
          break;
        case "usage":
          result.usage = ev.usage;
          break;
      }
    }
  } catch (err) {
    if (!sse.abort.signal.aborted) throw err;
  }
  result.stopped = sse.abort.signal.aborted;
  return result;
}

/** Appends the model answer atomically so concurrent writers on the same chat are not overwritten. */
async function persistAnswer(chat: ChatDoc, modelMessage: PlainMessage, memory: { summary: string; summarizedUpTo: number }, model: string, title?: string) {
  await Chat.updateOne(
    { _id: chat._id },
    {
      $push: { messages: modelMessage },
      $inc: { messageCount: 1 },
      $set: { lastMessageAt: modelMessage.createdAt, summary: memory.summary, summarizedUpTo: memory.summarizedUpTo, model, ...(title ? { title } : {}) },
    },
    { runValidators: true },
  );
}

/**
 * Streams a model answer for the user message at `userMessageIndex` (the last message of the chat),
 * persists it and emits SSE events: `meta`, `chunk`, `sources`, `tool`, `done`, `error`.
 */
export async function streamAnswer(req: Request, res: Response, params: RunParams): Promise<void> {
  const { chat, user, options } = params;
  const sse = new SseWriter(req, res);
  const userMsg = chat.messages[params.userMessageIndex];
  if (!userMsg || userMsg.role !== "user" || params.userMessageIndex !== chat.messages.length - 1) {
    sse.send("error", { message: "Invalid message to answer" });
    sse.end();
    return;
  }

  try {
    const opts = resolveOptions(chat, user, options);
    sse.send("meta", {
      chatId: String(chat._id),
      userMessageId: String(userMsg._id),
      model: opts.model.id,
      webSearch: opts.webSearch,
      tools: opts.tools,
      useDocuments: opts.useDocuments,
    });

    const { history, summary, summarizedUpTo } = await buildHistory(chat, params.userMessageIndex);
    const systemParts = [DEFAULT_SYSTEM];
    const custom = chat.systemInstruction || user.settings.systemInstruction;
    if (custom) systemParts.push(`User instructions:\n${custom}`);
    if (summary) systemParts.push(`Memory of earlier conversation:\n${summary}`);

    let ragSources: Source[] = [];
    if (opts.useDocuments) {
      const ctx = await documentContext(user.clerkId, userMsg.text, options.documentIds ?? []);
      if (ctx.prompt) {
        systemParts.push(ctx.prompt);
        ragSources = ctx.sources;
        sse.send("sources", { sources: ragSources });
      }
    }

    const images = await loadImages(userMsg.images ?? []);
    const events = opts.provider.stream({
      model: opts.model.id,
      systemInstruction: systemParts.join("\n\n"),
      history,
      message: toTurn(userMsg, images),
      temperature: opts.temperature,
      maxOutputTokens: opts.maxOutputTokens,
      safetyLevel: user.settings.safetyLevel,
      webSearch: opts.webSearch,
      tools: opts.tools,
      signal: sse.abort.signal,
    });

    const result = await consumeStream(events, sse, ragSources);
    const text = result.text.trim() ? result.text : result.stopped ? STOPPED_TEXT : EMPTY_TEXT;
    const modelMessage = makeMessage({ role: "model", text, sources: result.sources, toolCalls: result.toolCalls, model: opts.model.id, usage: result.usage });

    const title = params.generateTitle ? await generateTitle(userMsg.text, text) : undefined;
    await persistAnswer(chat, modelMessage, { summary, summarizedUpTo }, opts.model.id, title);
    await recordUsage(user.clerkId, result.usage.totalTokens);

    if (result.stopped) return;
    const followUps = user.settings.followUps && text.length > MIN_ANSWER_LENGTH_FOR_FOLLOW_UPS ? await generateFollowUps(userMsg.text, text) : [];
    sse.send("done", { chatId: String(chat._id), message: serializeMessage(modelMessage), title: title ?? chat.title, followUps, usage: result.usage });
  } catch (err) {
    logger.error({ err }, "Generation failed");
    sse.send("error", { message: friendlyError(err instanceof Error ? err.message : "Generation failed") });
  } finally {
    sse.end();
  }
}

function friendlyError(message: string): string {
  if (/api key|permission|401|403/i.test(message)) return "The AI provider rejected the request. Check the server API key.";
  if (/429|quota|rate/i.test(message)) return "The AI provider is rate limiting requests. Please try again in a moment.";
  if (/safety|blocked/i.test(message)) return "The response was blocked by safety filters. Try lowering the safety level in Settings.";
  return message.length > 200 ? "Generation failed. Please try again." : message;
}

/** Builds a user message subdocument from request input. */
export function buildUserMessage(text: string, images: IncomingImage[] = []): PlainMessage {
  if (!text.trim() && images.length === 0) throw badRequest("Message text or an image is required");
  return makeMessage({
    role: "user",
    text: text.trim(),
    images: images.map((i) => ({ filePath: i.filePath, mimeType: i.mimeType ?? "image/png", url: imageUrl(i.filePath) })),
  });
}

export function assertHistoryLimit(chat: ChatDoc): void {
  if (chat.messages.length >= env.MAX_HISTORY_MESSAGES) {
    throw badRequest(`This chat reached the ${env.MAX_HISTORY_MESSAGES} message limit. Start a new chat to continue.`);
  }
}
