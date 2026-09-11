import { env } from "../../config/env.js";
import { gemini } from "./gemini.js";
import { openai } from "./openai.js";
import type { ChatProvider, ModelInfo } from "./types.js";

const providers: ChatProvider[] = [gemini, openai];

export function listModels(): ModelInfo[] {
  return providers.filter((p) => p.isConfigured()).flatMap((p) => p.models());
}

/** Resolves the provider for a model id, falling back to the default model when unknown. */
export function resolveModel(requested?: string | null): { provider: ChatProvider; model: ModelInfo } {
  const available = listModels();
  const model = available.find((m) => m.id === requested) ?? available.find((m) => m.id === env.DEFAULT_MODEL) ?? available[0];
  if (!model) throw new Error("No AI provider is configured. Set GEMINI_API_KEY or OPENAI_API_KEY.");
  const provider = providers.find((p) => p.id === model.provider)!;
  return { provider, model };
}

/** Provider used for cheap helper completions (titles, follow-ups, summaries). */
export function helperProvider(): ChatProvider | null {
  return providers.find((p) => p.isConfigured()) ?? null;
}

export { gemini, openai };
export type { ChatProvider, ModelInfo };
