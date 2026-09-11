import mongoose from "mongoose";
import type { Request, Response } from "express";
import { Chat, type ChatDoc, type MessageDoc } from "../models/Chat.js";
import type { UserDoc } from "../models/User.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { SseWriter } from "../utils/sse.js";
import { recordUsage } from "../middleware/quota.js";
import { badRequest } from "../utils/errors.js";
import { MEMORY, generateFollowUps, generateTitle, summarizeTurns } from "./ai.js";
import { buildRagPrompt, retrieveContext } from "./documents.js";
import { fetchImageAsBase64, imageUrl } from "./imagekit.js";
import { resolveModel } from "./providers/index.js";
import type { ChatTurn, Source, ToolCallRecord, Usage } from "./providers/types.js";

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

const DEFAULT_SYSTEM = `You are KOALA AI, a helpful, precise and friendly assistant. Format answers in Markdown: use headings sparingly, code blocks with a language tag, tables for tabular data and LaTeX ($...$ or $$...$$) for math. Answer in the user's language.`;

function toTurn(m: Pick<MessageDoc, "role" | "text">, images?: Array<{ mimeType: string; data: string }>): ChatTurn {
  return { role: m.role, text: m.text, ...(images?.length ? { images } : {}) };
}

/** Assembles the history sent to the model, applying rolling-summary memory for long chats. */
async function buildHistory(chat: ChatDoc, upToIndex: number): Promise<{ history: ChatTurn[]; summary: string; summarizedUpTo: number }> {
  const msgs = chat.messages.slice(0, upToIndex);
  let summary = chat.summary ?? "";
  let summarizedUpTo = Math.min(chat.summarizedUpTo ?? 0, msgs.length);

  const unsummarizedBeyondWindow = msgs.length - MEMORY.recentWindow - summarizedUpTo;
  if (unsummarizedBeyondWindow >= MEMORY.summarizeEvery) {
    const cutoff = msgs.length - MEMORY.recentWindow;
    const turns = msgs.slice(summarizedUpTo, cutoff).map((m) => toTurn(m));
    summary = await summarizeTurns(summary, turns);
    summarizedUpTo = cutoff;
  }

  const recent = msgs.slice(Math.max(summarizedUpTo, msgs.length - MEMORY.recentWindow));
  // Older images are dropped from context to keep requests small; text stays.
  const history = recent.map((m) => toTurn(m));
  return { history, summary, summarizedUpTo };
}

async function loadImages(images: IncomingImage[]): Promise<Array<{ mimeType: string; data: string }>> {
  const out: Array<{ mimeType: string; data: string }> = [];
  for (const img of images.slice(0, 4)) {
    try {
      out.push(await fetchImageAsBase64(img.filePath, img.mimeType));
    } catch (err) {
      logger.warn({ err, filePath: img.filePath }, "Could not load image for the model");
    }
  }
  return out;
}

export interface RunParams {
  chat: ChatDoc;
  user: UserDoc;
  /** Index of the user message in chat.messages that the model should answer. */
  userMessageIndex: number;
  options: GenerateOptions;
  /** When true, generate a title after the first exchange. */
  generateTitle?: boolean;
}

/**
 * Streams a model answer for the user message at `userMessageIndex`, persists it and
 * emits SSE events: `meta`, `chunk`, `sources`, `tool`, `done`, `error`.
 */
export async function streamAnswer(req: Request, res: Response, params: RunParams): Promise<void> {
  const { chat, user, options } = params;
  const sse = new SseWriter(req, res);
  const userMsg = chat.messages[params.userMessageIndex];
  if (!userMsg || userMsg.role !== "user") {
    sse.send("error", { message: "Invalid message to answer" });
    sse.end();
    return;
  }

  const settings = user.settings;

  try {
    const { provider, model } = resolveModel(options.model ?? chat.model ?? settings.model);
    const webSearch = Boolean(options.webSearch ?? settings.webSearch) && model.supportsWebSearch;
    const tools = Boolean(options.tools ?? settings.tools) && model.supportsTools && !webSearch;
    const useDocuments = Boolean(options.useDocuments ?? settings.useDocuments);

    sse.send("meta", {
      chatId: String(chat._id),
      userMessageId: String(userMsg._id),
      model: model.id,
      webSearch,
      tools,
      useDocuments,
    });

    const { history, summary, summarizedUpTo } = await buildHistory(chat, params.userMessageIndex);

    const systemParts = [DEFAULT_SYSTEM];
    const custom = chat.systemInstruction || settings.systemInstruction;
    if (custom) systemParts.push(`User instructions:\n${custom}`);
    if (summary) systemParts.push(`Memory of earlier conversation:\n${summary}`);

    let ragSources: Source[] = [];
    if (useDocuments && userMsg.text) {
      const chunks = await retrieveContext(user.clerkId, userMsg.text, { documentIds: options.documentIds ?? [], topK: 6 });
      if (chunks.length) {
        systemParts.push(buildRagPrompt(chunks));
        const seen = new Set<string>();
        ragSources = chunks
          .filter((c) => (seen.has(c.documentId) ? false : (seen.add(c.documentId), true)))
          .map((c) => ({ title: c.documentName, uri: `document:${c.documentId}` }));
        sse.send("sources", { sources: ragSources });
      }
    }

    const images = await loadImages(userMsg.images ?? []);
    const message = toTurn(userMsg, images);

    let text = "";
    const sources: Source[] = [...ragSources];
    const toolCalls: ToolCallRecord[] = [];
    let usage: Usage = { promptTokens: 0, candidateTokens: 0, totalTokens: 0 };

    const stream = provider.stream({
      model: model.id,
      systemInstruction: systemParts.join("\n\n"),
      history,
      message,
      temperature: options.temperature ?? settings.temperature,
      maxOutputTokens: options.maxOutputTokens ?? settings.maxOutputTokens,
      safetyLevel: settings.safetyLevel,
      webSearch,
      tools,
      signal: sse.abort.signal,
    });

    for await (const ev of stream) {
      if (sse.isClosed) break;
      switch (ev.type) {
        case "text":
          text += ev.text;
          sse.send("chunk", { text: ev.text });
          break;
        case "sources":
          sources.push(...ev.sources);
          sse.send("sources", { sources: ev.sources });
          break;
        case "tool":
          toolCalls.push(ev.call);
          sse.send("tool", ev.call);
          break;
        case "usage":
          usage = ev.usage;
          break;
      }
    }

    const stopped = sse.isClosed;
    if (!text.trim() && !stopped) text = "_The model returned an empty response. Try rephrasing or adjusting the safety level._";
    if (!text.trim() && stopped) text = "_Generation stopped._";

    const modelMessage = {
      _id: new mongoose.Types.ObjectId(),
      role: "model" as const,
      text,
      images: [],
      sources,
      toolCalls,
      model: model.id,
      feedback: null,
      feedbackNote: "",
      usage,
      edited: false,
      createdAt: new Date(),
    };

    // Persist: truncate anything after the answered user message, then append the answer.
    const kept = chat.messages.slice(0, params.userMessageIndex + 1);
    const update: Record<string, unknown> = {
      messages: [...kept, modelMessage],
      messageCount: kept.length + 1,
      lastMessageAt: new Date(),
      summary,
      summarizedUpTo,
      model: model.id,
    };

    let title = chat.title;
    if (params.generateTitle) {
      title = await generateTitle(userMsg.text, text);
      update.title = title;
    }
    await Chat.updateOne({ _id: chat._id }, { $set: update }, { runValidators: true });
    await recordUsage(user.clerkId, usage.totalTokens);

    let followUps: string[] = [];
    if (settings.followUps && !stopped && text.length > 40) {
      followUps = await generateFollowUps(userMsg.text, text);
    }

    sse.send("done", {
      chatId: String(chat._id),
      message: { ...modelMessage, _id: String(modelMessage._id) },
      title,
      followUps,
      usage,
    });
  } catch (err) {
    if (sse.abort.signal.aborted) {
      logger.debug("Client aborted generation");
    } else {
      logger.error({ err }, "Generation failed");
      const message = err instanceof Error ? err.message : "Generation failed";
      sse.send("error", { message: friendlyError(message) });
    }
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
export function buildUserMessage(text: string, images: IncomingImage[] = []) {
  if (!text.trim() && images.length === 0) throw badRequest("Message text or an image is required");
  return {
    _id: new mongoose.Types.ObjectId(),
    role: "user" as const,
    text: text.trim(),
    images: images.map((i) => ({ filePath: i.filePath, mimeType: i.mimeType ?? "image/png", url: imageUrl(i.filePath) })),
    sources: [],
    toolCalls: [],
    model: "",
    feedback: null,
    feedbackNote: "",
    usage: { promptTokens: 0, candidateTokens: 0, totalTokens: 0 },
    edited: false,
    createdAt: new Date(),
  };
}

export function assertHistoryLimit(chat: ChatDoc): void {
  if (chat.messages.length >= env.MAX_HISTORY_MESSAGES) {
    throw badRequest(`This chat reached the ${env.MAX_HISTORY_MESSAGES} message limit. Start a new chat to continue.`);
  }
}
