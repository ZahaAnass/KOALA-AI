import { env } from "../../config/env.js";
import type { ChatProvider, ChatTurn, ModelInfo, StreamEvent, StreamParams } from "./types.js";

const MODELS: ModelInfo[] = [
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    provider: "openai",
    description: "OpenAI's fast, low-cost multimodal model.",
    supportsImages: true,
    supportsTools: false,
    supportsWebSearch: false,
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    provider: "openai",
    description: "OpenAI's flagship multimodal model.",
    supportsImages: true,
    supportsTools: false,
    supportsWebSearch: false,
  },
];

type OpenAIContent = string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
type OpenAIMessage = { role: "system" | "user" | "assistant"; content: OpenAIContent };

function turnToMessage(turn: ChatTurn): OpenAIMessage {
  const role = turn.role === "model" ? "assistant" : "user";
  if (!turn.images?.length) return { role, content: turn.text };
  return {
    role,
    content: [
      ...turn.images.map((img) => ({
        type: "image_url" as const,
        image_url: { url: `data:${img.mimeType};base64,${img.data}` },
      })),
      { type: "text" as const, text: turn.text || " " },
    ],
  };
}

/**
 * Minimal OpenAI Chat Completions adapter using fetch (no SDK dependency).
 * Enabled only when OPENAI_API_KEY is set.
 */
export class OpenAIProvider implements ChatProvider {
  readonly id = "openai" as const;

  isConfigured(): boolean {
    return Boolean(env.OPENAI_API_KEY);
  }

  models(): ModelInfo[] {
    return this.isConfigured() ? MODELS : [];
  }

  async *stream(params: StreamParams): AsyncGenerator<StreamEvent> {
    const messages: OpenAIMessage[] = [];
    if (params.systemInstruction) messages.push({ role: "system", content: params.systemInstruction });
    for (const turn of params.history) messages.push(turnToMessage(turn));
    messages.push(turnToMessage(params.message));

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: params.model,
        messages,
        temperature: params.temperature,
        max_tokens: params.maxOutputTokens,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal: params.signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const json = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
            usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
          };
          const text = json.choices?.[0]?.delta?.content;
          if (text) yield { type: "text", text };
          if (json.usage) {
            yield {
              type: "usage",
              usage: {
                promptTokens: json.usage.prompt_tokens,
                candidateTokens: json.usage.completion_tokens,
                totalTokens: json.usage.total_tokens,
              },
            };
          }
        } catch {
          // ignore malformed chunk
        }
      }
    }
  }

  async complete(prompt: string, opts: { maxOutputTokens?: number; json?: boolean } = {}): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: opts.maxOutputTokens ?? 256,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content ?? "";
  }
}

export const openai = new OpenAIProvider();
