export type ChatRole = "user" | "model";

export interface ImagePart {
  mimeType: string;
  data: string; // base64
}

export interface ChatTurn {
  role: ChatRole;
  text: string;
  images?: ImagePart[];
}

export interface ModelInfo {
  id: string;
  label: string;
  provider: "gemini" | "openai";
  description: string;
  supportsImages: boolean;
  supportsTools: boolean;
  supportsWebSearch: boolean;
}

export interface Source {
  title: string;
  uri: string;
}

export interface Usage {
  promptTokens: number;
  candidateTokens: number;
  totalTokens: number;
}

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "sources"; sources: Source[] }
  | { type: "tool"; call: ToolCallRecord }
  | { type: "usage"; usage: Usage };

export interface StreamParams {
  model: string;
  systemInstruction?: string;
  history: ChatTurn[];
  message: ChatTurn;
  temperature: number;
  maxOutputTokens: number;
  safetyLevel: "off" | "low" | "medium" | "high";
  webSearch: boolean;
  tools: boolean;
  signal: AbortSignal;
}

export interface ChatProvider {
  readonly id: "gemini" | "openai";
  isConfigured(): boolean;
  models(): ModelInfo[];
  stream(params: StreamParams): AsyncGenerator<StreamEvent>;
  /** Cheap single-shot text completion used for titles, follow-ups and summaries. */
  complete(prompt: string, opts?: { maxOutputTokens?: number; json?: boolean }): Promise<string>;
}
