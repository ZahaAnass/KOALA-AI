import type {
  AdminStats,
  AdminUser,
  ChatDetail,
  ChatListResponse,
  ChatSummary,
  KnowledgeDocument,
  ModelsResponse,
  PromptTemplate,
  SendMessageBody,
  Settings,
  SharedChat,
  StreamEvent,
  UploadAuth,
  UrlFetchResult,
  UsageResponse,
  User,
  GenerateOptions,
} from "@/types/api";
import { readSse } from "./sse";

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "ERROR",
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type TokenGetter = () => Promise<string | null>;
let getToken: TokenGetter = async () => null;

/** Registered once by the auth provider so every request carries the Clerk JWT. */
export function setTokenGetter(fn: TokenGetter): void {
  getToken = fn;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown } };
    return new ApiError(res.status, body.error?.message ?? res.statusText, body.error?.code, body.error?.details);
  } catch {
    return new ApiError(res.status, res.statusText || "Request failed");
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  raw?: boolean;
}

async function request<T>(path: string, { body, raw, headers, ...init }: RequestOptions = {}): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(isForm ? {} : body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(await authHeaders()),
      ...(headers as Record<string, string>),
    },
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await parseError(res);
  if (raw) return res as unknown as T;
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const qs = (params: Record<string, string | number | boolean | undefined>): string => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}` : "";
};

/** Streams a chat endpoint and yields typed events. Abort with the signal to stop generation. */
async function* streamWithMethod(method: "POST" | "PUT", path: string, body: unknown, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...(await authHeaders()) },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw await parseError(res);
  for await (const msg of readSse(res)) {
    try {
      yield { type: msg.event, ...(JSON.parse(msg.data) as object) } as StreamEvent;
    } catch {
      // skip malformed frames
    }
  }
}

export const api = {
  models: () => request<ModelsResponse>("/api/models"),

  chats: {
    list: (params: { q?: string; archived?: boolean; pinned?: boolean; tag?: string; folder?: string; limit?: number; offset?: number } = {}) =>
      request<ChatListResponse>(`/api/chats${qs({ ...params, archived: params.archived === undefined ? undefined : String(params.archived), pinned: params.pinned === undefined ? undefined : String(params.pinned) })}`),
    meta: () => request<{ tags: string[]; folders: string[] }>("/api/chats/meta"),
    get: (id: string, params: { limit?: number; before?: number } = {}) => request<ChatDetail>(`/api/chats/${id}${qs(params)}`),
    create: (body: SendMessageBody, signal?: AbortSignal) => streamWithMethod("POST", "/api/chats", body, signal),
    send: (id: string, body: SendMessageBody, signal?: AbortSignal) => streamWithMethod("POST", `/api/chats/${id}/messages`, body, signal),
    regenerate: (id: string, messageId: string, options: GenerateOptions = {}, signal?: AbortSignal) =>
      streamWithMethod("POST", `/api/chats/${id}/messages/${messageId}/regenerate`, { options }, signal),
    edit: (id: string, messageId: string, text: string, options: GenerateOptions = {}, signal?: AbortSignal) =>
      streamWithMethod("PUT", `/api/chats/${id}/messages/${messageId}`, { text, options }, signal),
    update: (id: string, patch: Partial<Pick<ChatSummary, "title" | "pinned" | "archived" | "tags" | "folder" | "model">> & { systemInstruction?: string }) =>
      request<ChatSummary>(`/api/chats/${id}`, { method: "PATCH", body: patch }),
    remove: (id: string) => request<void>(`/api/chats/${id}`, { method: "DELETE" }),
    bulkRemove: (ids: string[]) => request<{ deleted: number }>("/api/chats/bulk-delete", { method: "POST", body: { ids } }),
    clear: () => request<{ deleted: number }>("/api/chats", { method: "DELETE" }),
    feedback: (id: string, messageId: string, feedback: "up" | "down" | null, note?: string) =>
      request<{ ok: true }>(`/api/chats/${id}/messages/${messageId}/feedback`, { method: "POST", body: { feedback, note } }),
    exportUrl: (id: string, format: "md" | "json" | "pdf") => `${API_URL}/api/chats/${id}/export?format=${format}`,
    export: (id: string, format: "md" | "json" | "pdf") => request<Response>(`/api/chats/${id}/export?format=${format}`, { raw: true }),
    share: (id: string) => request<{ shareToken: string; sharedAt: string }>(`/api/chats/${id}/share`, { method: "POST" }),
    unshare: (id: string) => request<void>(`/api/chats/${id}/share`, { method: "DELETE" }),
  },

  share: { get: (token: string) => request<SharedChat>(`/api/share/${token}`) },

  users: {
    me: () => request<User>("/api/users/me"),
    updateSettings: (patch: Partial<Settings>) => request<User>("/api/users/me/settings", { method: "PATCH", body: patch }),
    onboarded: () => request<{ ok: true }>("/api/users/me/onboarded", { method: "POST" }),
    usage: (days = 30) => request<UsageResponse>(`/api/users/me/usage?days=${days}`),
    deleteAccount: () => request<void>("/api/users/me", { method: "DELETE" }),
  },

  admin: {
    stats: () => request<AdminStats>("/api/admin/stats"),
    users: (params: { q?: string; limit?: number; offset?: number } = {}) => request<{ items: AdminUser[]; total: number }>(`/api/admin/users${qs(params)}`),
    updateUser: (id: string, patch: { role?: "user" | "admin"; dailyQuota?: number | null }) =>
      request<{ id: string; role: string; dailyQuota: number | null }>(`/api/admin/users/${id}`, { method: "PATCH", body: patch }),
    deleteUser: (id: string) => request<void>(`/api/admin/users/${id}`, { method: "DELETE" }),
  },

  prompts: {
    list: () => request<{ builtin: PromptTemplate[]; items: PromptTemplate[] }>("/api/prompts"),
    create: (body: Pick<PromptTemplate, "title" | "content" | "category" | "icon">) => request<PromptTemplate>("/api/prompts", { method: "POST", body }),
    update: (id: string, body: Pick<PromptTemplate, "title" | "content" | "category" | "icon">) => request<PromptTemplate>(`/api/prompts/${id}`, { method: "PUT", body }),
    remove: (id: string) => request<void>(`/api/prompts/${id}`, { method: "DELETE" }),
  },

  documents: {
    list: () => request<{ items: KnowledgeDocument[] }>("/api/documents"),
    upload: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<KnowledgeDocument>("/api/documents", { method: "POST", body: form });
    },
    remove: (id: string) => request<void>(`/api/documents/${id}`, { method: "DELETE" }),
  },

  tools: {
    url: (url: string) => request<UrlFetchResult>("/api/tools/url", { method: "POST", body: { url } }),
  },

  images: {
    generate: (prompt: string, chatId?: string) =>
      request<{ prompt: string; mimeType: string; filePath: string; url: string }>("/api/images/generate", { method: "POST", body: { prompt, chatId } }),
  },

  upload: {
    auth: () => request<UploadAuth>("/api/upload"),
    config: () => request<{ enabled: boolean; allowedTypes: string[]; maxBytes: number; urlEndpoint: string }>("/api/upload/config"),
  },
};

/** Uploads an image straight to ImageKit using server-signed parameters. */
export async function uploadImage(file: File, onProgress?: (pct: number) => void): Promise<{ filePath: string; url: string; mimeType: string }> {
  const auth = await api.upload.auth();
  if (!auth.allowedTypes.includes(file.type)) throw new ApiError(400, "Unsupported image type. Use PNG, JPG, WEBP or GIF.");
  if (file.size > auth.maxBytes) throw new ApiError(400, `Image is too large (max ${Math.round(auth.maxBytes / 1024 / 1024)} MB).`);

  const form = new FormData();
  form.append("file", file);
  form.append("fileName", file.name);
  form.append("publicKey", auth.publicKey);
  form.append("signature", auth.signature);
  form.append("expire", String(auth.expire));
  form.append("token", auth.token);
  form.append("useUniqueFileName", "true");
  form.append("folder", "/koala-ai/uploads");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://upload.imagekit.io/api/v1/files/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText) as { filePath: string; url: string };
        resolve({ filePath: data.filePath, url: data.url, mimeType: file.type });
      } else {
        reject(new ApiError(xhr.status, "Image upload failed"));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, "Network error during upload"));
    xhr.send(form);
  });
}
