import { logger } from "../config/logger.js";
import { helperProvider } from "./providers/index.js";
import type { ChatTurn } from "./providers/types.js";

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Fallback title from the first user message. */
export function fallbackTitle(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean ? clip(clean, 60) : "New chat";
}

/** Asks the helper model for a short conversation title. */
export async function generateTitle(userText: string, answer = ""): Promise<string> {
  const provider = helperProvider();
  if (!provider) return fallbackTitle(userText);
  try {
    const raw = await provider.complete(
      `Write a concise title (max 6 words, no quotes, no trailing punctuation, same language as the user) for a chat that starts with:\n\nUser: ${clip(userText, 800)}\n${answer ? `Assistant: ${clip(answer, 800)}\n` : ""}\nTitle:`,
      { maxOutputTokens: 24 },
    );
    const title = raw.split("\n")[0]?.replace(/^["'#*\s-]+|["'*\s.]+$/g, "").trim() ?? "";
    return title ? clip(title, 80) : fallbackTitle(userText);
  } catch (err) {
    logger.warn({ err }, "Title generation failed");
    return fallbackTitle(userText);
  }
}

/** Suggests up to three follow-up questions the user might ask next. */
export async function generateFollowUps(question: string, answer: string): Promise<string[]> {
  const provider = helperProvider();
  if (!provider) return [];
  try {
    const raw = await provider.complete(
      `Given this exchange, suggest 3 short follow-up questions the user could ask next. Use the user's language. Respond ONLY with JSON of the form {"questions": ["...", "...", "..."]}.\n\nUser: ${clip(question, 1000)}\nAssistant: ${clip(answer, 2000)}`,
      { maxOutputTokens: 200, json: true },
    );
    const parsed: unknown = JSON.parse(raw.replace(/```json|```/g, "").trim());
    const list = Array.isArray(parsed) ? parsed : (parsed as { questions?: unknown })?.questions;
    if (!Array.isArray(list)) return [];
    return list.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 3);
  } catch (err) {
    logger.debug({ err }, "Follow-up generation failed");
    return [];
  }
}

/** Compresses older turns into a running summary so long chats stay within context. */
export async function summarizeTurns(existingSummary: string, turns: ChatTurn[]): Promise<string> {
  const provider = helperProvider();
  if (!provider || turns.length === 0) return existingSummary;
  const transcript = turns.map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${clip(t.text, 1500)}`).join("\n");
  try {
    const summary = await provider.complete(
      `You maintain a compact memory of a conversation.\n${existingSummary ? `Existing memory:\n${existingSummary}\n\n` : ""}New conversation turns:\n${transcript}\n\nUpdate the memory: keep key facts, user preferences, decisions, names, numbers and open questions. Max 300 words. Plain text.`,
      { maxOutputTokens: 600 },
    );
    return summary.trim() || existingSummary;
  } catch (err) {
    logger.warn({ err }, "Summarization failed");
    return existingSummary;
  }
}

/** Constants controlling when memory summarization kicks in. */
export const MEMORY = {
  /** Number of most recent turns always sent verbatim. */
  recentWindow: 20,
  /** Summarize once this many un-summarized turns accumulate beyond the window. */
  summarizeEvery: 10,
};
