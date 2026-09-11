export type Role = "user" | "model";

export interface ImageRef {
  filePath: string;
  mimeType: string;
  url: string;
}

export interface Source {
  title: string;
  uri: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface Usage {
  promptTokens: number;
  candidateTokens: number;
  totalTokens: number;
}

export interface Message {
  _id: string;
  role: Role;
  text: string;
  images: ImageRef[];
  sources: Source[];
  toolCalls: ToolCall[];
  model: string;
  feedback: "up" | "down" | null;
  feedbackNote?: string;
  usage: Usage;
  edited: boolean;
  createdAt: string;
  /** Client-only: message currently being streamed. */
  streaming?: boolean;
  /** Client-only: local error while generating. */
  error?: string;
}

export interface ChatSummary {
  _id: string;
  title: string;
  model: string;
  pinned: boolean;
  archived: boolean;
  tags: string[];
  folder: string;
  shareToken: string | null;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  snippet?: string;
}

/** A chat summary that may carry per-chat instructions (detail view or sidebar item). */
export type ChatWithInstructions = ChatSummary & { systemInstruction?: string };

export interface ChatDetail extends ChatSummary {
  systemInstruction: string;
  messages: Message[];
  page: { start: number; end: number; total: number; hasMore: boolean };
}

export interface ChatListResponse {
  items: ChatSummary[];
  total: number;
  limit: number;
  offset: number;
}

export type SafetyLevel = "off" | "low" | "medium" | "high";
export type Theme = "system" | "light" | "dark";
export type Locale = "en" | "fr";

export interface Settings {
  model: string;
  systemInstruction: string;
  temperature: number;
  maxOutputTokens: number;
  theme: Theme;
  locale: Locale;
  safetyLevel: SafetyLevel;
  followUps: boolean;
  webSearch: boolean;
  tools: boolean;
  useDocuments: boolean;
}

export interface Quota {
  limit: number | null;
  usedToday: number;
  remaining: number | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  imageUrl: string;
  role: "user" | "admin";
  onboarded: boolean;
  settings: Settings;
  quota: Quota;
  totals: { messages: number; tokens: number };
  createdAt: string;
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

export interface ModelsResponse {
  defaultModel: string;
  models: ModelInfo[];
  features: {
    imageUploads: boolean;
    imageGeneration: boolean;
    documents: boolean;
    webSearch: boolean;
    tools: boolean;
  };
}

export interface GenerateOptions {
  model?: string;
  webSearch?: boolean;
  tools?: boolean;
  useDocuments?: boolean;
  documentIds?: string[];
  temperature?: number;
  maxOutputTokens?: number;
}

export interface SendMessageBody {
  text: string;
  images?: Array<{ filePath: string; mimeType?: string }>;
  options?: GenerateOptions;
}

export interface KnowledgeDocument {
  _id: string;
  name: string;
  mimeType: string;
  size: number;
  chunkCount: number;
  status: "ready" | "failed";
  createdAt: string;
}

export interface PromptTemplate {
  _id: string;
  title: string;
  content: string;
  category: string;
  icon: string;
  builtin: boolean;
}

export interface UsageResponse {
  days: number;
  series: Array<{ day: string; user: number; model: number; tokens: number }>;
  totals: { chats: number; documents: number; messages: number; tokens: number };
  models: Array<{ model: string; count: number }>;
  quota: Quota;
}

export interface AdminStats {
  totals: { users: number; chats: number; documents: number; messages: number; tokens: number };
  daily: Array<{ day: string; messages: number; activeUsers: number }>;
  models: Array<{ model: string; count: number }>;
  feedback: { up: number; down: number };
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  imageUrl: string;
  role: "user" | "admin";
  dailyQuota: number | null;
  usage: { day: string; count: number; totalMessages: number; totalTokens: number };
  chats: number;
  messages: number;
  lastSeenAt: string;
  createdAt: string;
}

export interface SharedChat {
  title: string;
  model: string;
  sharedAt: string;
  createdAt: string;
  messages: Array<Pick<Message, "_id" | "role" | "text" | "images" | "sources" | "createdAt">>;
}

export interface UploadAuth {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
  allowedTypes: string[];
  maxBytes: number;
}

export interface UrlFetchResult {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
}

/** Events emitted by the streaming endpoints. */
export type StreamEvent =
  | { type: "meta"; chatId: string; userMessageId: string; model: string; webSearch: boolean; tools: boolean; useDocuments: boolean }
  | { type: "chunk"; text: string }
  | { type: "sources"; sources: Source[] }
  | { type: "tool"; name: string; args: Record<string, unknown>; result: unknown }
  | { type: "done"; chatId: string; message: Message; title: string; followUps: string[]; usage: Usage }
  | { type: "error"; message: string };
