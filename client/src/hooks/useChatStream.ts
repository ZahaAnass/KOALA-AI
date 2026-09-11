import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { queryClient, queryKeys } from "@/lib/queryClient";
import { useChatStore } from "@/store/chat";
import type { ChatDetail, ChatListResponse, GenerateOptions, Message, StreamEvent } from "@/types/api";

interface SendParams {
  chatId?: string;
  text: string;
  images?: Array<{ filePath: string; mimeType: string; url: string }>;
  options?: GenerateOptions;
}

const emptyUsage = { promptTokens: 0, candidateTokens: 0, totalTokens: 0 };

function optimisticUserMessage(text: string, images: SendParams["images"] = []): Message {
  return {
    _id: `local-${Date.now()}`,
    role: "user",
    text,
    images,
    sources: [],
    toolCalls: [],
    model: "",
    feedback: null,
    usage: emptyUsage,
    edited: false,
    createdAt: new Date().toISOString(),
  };
}

/** Applies the finished exchange to the cached chat and sidebar list. */
function commitToCache(chatId: string, userMessage: Message | null, answeringMessageId: string | null, modelMessage: Message, title: string) {
  queryClient.setQueryData<ChatDetail>(queryKeys.chat(chatId), (chat) => {
    if (!chat) return chat;
    let messages = chat.messages;
    if (answeringMessageId) {
      const idx = messages.findIndex((m) => m._id === answeringMessageId);
      if (idx >= 0) messages = messages.slice(0, idx + 1);
      if (userMessage) messages = messages.map((m) => (m._id === answeringMessageId ? { ...m, text: userMessage.text, edited: true } : m));
    } else if (userMessage) {
      messages = [...messages, { ...userMessage, _id: `user-${modelMessage._id}` }];
    }
    messages = [...messages, modelMessage];
    return { ...chat, title, messages, messageCount: messages.length, lastMessageAt: modelMessage.createdAt, page: { ...chat.page, end: messages.length, total: messages.length } };
  });

  queryClient.setQueriesData<ChatListResponse>({ queryKey: ["chats"], exact: false }, (list) => {
    if (!list || !("items" in list)) return list;
    const exists = list.items.some((c) => c._id === chatId);
    const items = exists ? list.items.map((c) => (c._id === chatId ? { ...c, title, lastMessageAt: modelMessage.createdAt, messageCount: c.messageCount + 2 } : c)) : list.items;
    return { ...list, items };
  });
}

/**
 * Drives one streaming generation: consumes SSE events, updates the chat store for live
 * rendering, then commits the final exchange to the React Query cache.
 */
async function runGeneration(events: AsyncGenerator<StreamEvent>, onChatId?: (id: string) => void): Promise<void> {
  const store = useChatStore.getState();
  try {
    for await (const ev of events) {
      switch (ev.type) {
        case "meta":
          useChatStore.getState().setChatId(ev.chatId);
          useChatStore.getState().setModel(ev.model);
          onChatId?.(ev.chatId);
          break;
        case "chunk":
          useChatStore.getState().appendText(ev.text);
          break;
        case "sources":
          useChatStore.getState().addSources(ev.sources);
          break;
        case "tool":
          useChatStore.getState().addToolCall({ name: ev.name, args: ev.args, result: ev.result });
          break;
        case "done": {
          const active = useChatStore.getState().active;
          commitToCache(ev.chatId, active?.userMessage ?? null, active?.answeringMessageId ?? null, ev.message, ev.title);
          useChatStore.getState().setFollowUps(ev.chatId, ev.followUps);
          void queryClient.invalidateQueries({ queryKey: queryKeys.me });
          useChatStore.getState().finish();
          return;
        }
        case "error":
          useChatStore.getState().fail(ev.message);
          return;
      }
    }
    // Stream ended without a `done` event (stopped by the user or connection dropped).
    const active = useChatStore.getState().active;
    if (active?.chatId) void queryClient.invalidateQueries({ queryKey: queryKeys.chat(active.chatId) });
    useChatStore.getState().finish();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      const active = useChatStore.getState().active;
      if (active?.chatId) void queryClient.invalidateQueries({ queryKey: queryKeys.chat(active.chatId) });
      useChatStore.getState().finish();
      return;
    }
    const message = err instanceof ApiError ? err.message : "Connection lost. Please try again.";
    store.fail(message);
    toast.error(message);
  } finally {
    void queryClient.invalidateQueries({ queryKey: ["chats"], exact: false });
  }
}

/** Public API for sending, editing, regenerating and stopping messages. */
export function useChatStream() {
  const navigate = useNavigate();
  const streaming = useChatStore((s) => s.streaming);
  const storedOptions = useChatStore((s) => s.options);

  const send = useCallback(
    async ({ chatId, text, images = [], options }: SendParams) => {
      if (useChatStore.getState().streaming) return;
      const controller = new AbortController();
      const merged = { ...storedOptions, ...options };
      useChatStore.getState().begin({ chatId: chatId ?? null, userMessage: optimisticUserMessage(text, images), answeringMessageId: null, model: merged.model ?? "" }, controller);
      const body = { text, images: images.map((i) => ({ filePath: i.filePath, mimeType: i.mimeType })), options: merged };
      const events = chatId ? api.chats.send(chatId, body, controller.signal) : api.chats.create(body, controller.signal);
      await runGeneration(events, chatId ? undefined : (id) => navigate(`/dashboard/chats/${id}`, { replace: false }));
    },
    [navigate, storedOptions],
  );

  const regenerate = useCallback(
    async (chatId: string, modelMessageId: string, options?: GenerateOptions) => {
      if (useChatStore.getState().streaming) return;
      const chat = queryClient.getQueryData<ChatDetail>(queryKeys.chat(chatId));
      const idx = chat?.messages.findIndex((m) => m._id === modelMessageId) ?? -1;
      const userMsg = idx > 0 ? chat!.messages.slice(0, idx).reverse().find((m) => m.role === "user") : undefined;
      const controller = new AbortController();
      useChatStore.getState().begin({ chatId, userMessage: null, answeringMessageId: userMsg?._id ?? null, model: "" }, controller);
      await runGeneration(api.chats.regenerate(chatId, modelMessageId, { ...storedOptions, ...options }, controller.signal));
    },
    [storedOptions],
  );

  const edit = useCallback(
    async (chatId: string, userMessageId: string, text: string, options?: GenerateOptions) => {
      if (useChatStore.getState().streaming) return;
      const controller = new AbortController();
      useChatStore.getState().begin({ chatId, userMessage: optimisticUserMessage(text), answeringMessageId: userMessageId, model: "" }, controller);
      await runGeneration(api.chats.edit(chatId, userMessageId, text, { ...storedOptions, ...options }, controller.signal));
    },
    [storedOptions],
  );

  const stop = useCallback(() => useChatStore.getState().stop(), []);

  return { send, regenerate, edit, stop, streaming };
}
