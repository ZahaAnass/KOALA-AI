import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  type Content,
  type GenerateContentConfig,
  type Part,
  type SafetySetting,
} from "@google/genai";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { executeTool, toolDeclarations } from "../tools.js";
import type { ChatProvider, ChatTurn, ModelInfo, Source, StreamEvent, StreamParams, Usage } from "./types.js";

const MODELS: ModelInfo[] = [
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "gemini",
    description: "Fast and affordable. Best default for everyday chat.",
    supportsImages: true,
    supportsTools: true,
    supportsWebSearch: true,
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    provider: "gemini",
    description: "Lowest latency and cost for simple tasks.",
    supportsImages: true,
    supportsTools: true,
    supportsWebSearch: true,
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "gemini",
    description: "Strongest reasoning for complex, multi-step work.",
    supportsImages: true,
    supportsTools: true,
    supportsWebSearch: true,
  },
];

const THRESHOLDS: Record<StreamParams["safetyLevel"], HarmBlockThreshold> = {
  off: HarmBlockThreshold.BLOCK_NONE,
  low: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  medium: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  high: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
};

function safetySettings(level: StreamParams["safetyLevel"]): SafetySetting[] {
  const threshold = THRESHOLDS[level];
  return [
    HarmCategory.HARM_CATEGORY_HARASSMENT,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
  ].map((category) => ({ category, threshold }));
}

function turnToContent(turn: ChatTurn): Content {
  const parts: Part[] = [];
  for (const img of turn.images ?? []) parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  if (turn.text) parts.push({ text: turn.text });
  if (parts.length === 0) parts.push({ text: " " });
  return { role: turn.role, parts };
}

function usageOf(meta: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | undefined): Usage | null {
  if (!meta) return null;
  return {
    promptTokens: meta.promptTokenCount ?? 0,
    candidateTokens: meta.candidatesTokenCount ?? 0,
    totalTokens: meta.totalTokenCount ?? 0,
  };
}

export class GeminiProvider implements ChatProvider {
  readonly id = "gemini" as const;
  private client: GoogleGenAI | null = null;

  private get ai(): GoogleGenAI {
    if (!this.client) {
      if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");
      this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return Boolean(env.GEMINI_API_KEY);
  }

  models(): ModelInfo[] {
    return MODELS;
  }

  async *stream(params: StreamParams): AsyncGenerator<StreamEvent> {
    const config: GenerateContentConfig = {
      temperature: params.temperature,
      maxOutputTokens: params.maxOutputTokens,
      safetySettings: safetySettings(params.safetyLevel),
      abortSignal: params.signal,
      ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
    };

    // Gemini does not allow Google Search grounding and function declarations in the same request.
    if (params.webSearch) config.tools = [{ googleSearch: {} }];
    else if (params.tools) config.tools = [{ functionDeclarations: toolDeclarations }];

    const contents: Content[] = [...params.history.map(turnToContent), turnToContent(params.message)];
    const seenSources = new Set<string>();
    let rounds = 0;

    // Loop to satisfy function calls (max 5 rounds to avoid runaway tool use).
    while (rounds < 5) {
      rounds++;
      const response = await this.ai.models.generateContentStream({ model: params.model, contents, config });
      const pendingCalls: Array<{ name: string; args: Record<string, unknown>; id?: string }> = [];
      const modelParts: Part[] = [];
      let usage: Usage | null = null;

      for await (const chunk of response) {
        if (params.signal.aborted) return;
        const candidate = chunk.candidates?.[0];
        for (const part of candidate?.content?.parts ?? []) {
          if (part.text) {
            modelParts.push({ text: part.text });
            yield { type: "text", text: part.text };
          } else if (part.functionCall?.name) {
            modelParts.push({ functionCall: part.functionCall });
            pendingCalls.push({
              name: part.functionCall.name,
              args: (part.functionCall.args ?? {}) as Record<string, unknown>,
              ...(part.functionCall.id ? { id: part.functionCall.id } : {}),
            });
          }
        }
        const chunksMeta = candidate?.groundingMetadata?.groundingChunks;
        if (chunksMeta?.length) {
          const fresh: Source[] = [];
          for (const c of chunksMeta) {
            const uri = c.web?.uri ?? "";
            if (!uri || seenSources.has(uri)) continue;
            seenSources.add(uri);
            fresh.push({ title: c.web?.title ?? uri, uri });
          }
          if (fresh.length) yield { type: "sources", sources: fresh };
        }
        const u = usageOf(chunk.usageMetadata);
        if (u) usage = u;
      }

      if (pendingCalls.length === 0) {
        if (usage) yield { type: "usage", usage };
        return;
      }

      contents.push({ role: "model", parts: modelParts });
      const responseParts: Part[] = [];
      for (const call of pendingCalls) {
        const result = await executeTool(call.name, call.args);
        yield { type: "tool", call: { name: call.name, args: call.args, result } };
        responseParts.push({
          functionResponse: {
            name: call.name,
            ...(call.id ? { id: call.id } : {}),
            response: typeof result === "object" && result !== null ? (result as Record<string, unknown>) : { result },
          },
        });
      }
      contents.push({ role: "user", parts: responseParts });
    }
    logger.warn("Gemini tool loop exceeded max rounds");
  }

  async complete(prompt: string, opts: { maxOutputTokens?: number; json?: boolean } = {}): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        temperature: 0.4,
        maxOutputTokens: opts.maxOutputTokens ?? 256,
        thinkingConfig: { thinkingBudget: 0 },
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    });
    return response.text ?? "";
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: texts,
      config: { outputDimensionality: 768 },
    });
    return (response.embeddings ?? []).map((e) => e.values ?? []);
  }

  async generateImage(prompt: string): Promise<{ mimeType: string; data: string } | null> {
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        return { mimeType: part.inlineData.mimeType ?? "image/png", data: part.inlineData.data };
      }
    }
    return null;
  }
}

export const gemini = new GeminiProvider();
