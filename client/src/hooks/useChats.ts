import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { ChatDetail, ChatListResponse, ChatSummary } from "@/types/api";

export interface ChatListFilters {
  q?: string;
  archived?: boolean;
  pinned?: boolean;
  tag?: string;
  folder?: string;
}

export function useChatList(filters: ChatListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.chats({ ...filters }),
    queryFn: () => api.chats.list({ ...filters, limit: 200 }),
    placeholderData: (prev) => prev,
  });
}

export function useChatMeta() {
  return useQuery({ queryKey: queryKeys.chatsMeta, queryFn: api.chats.meta, staleTime: 60_000 });
}

export function useChat(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.chat(id ?? ""),
    queryFn: () => api.chats.get(id!, { limit: 60 }),
    enabled: Boolean(id),
  });
}

/** Loads the previous page of messages into the cached chat. */
export function useLoadEarlier(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const current = qc.getQueryData<ChatDetail>(queryKeys.chat(id));
      if (!current?.page.hasMore) return current;
      const older = await api.chats.get(id, { limit: 60, before: current.page.start });
      const merged: ChatDetail = { ...current, messages: [...older.messages, ...current.messages], page: { ...current.page, start: older.page.start, hasMore: older.page.hasMore } };
      qc.setQueryData(queryKeys.chat(id), merged);
      return merged;
    },
  });
}

/** Mutations for a chat's metadata (rename, pin, archive, tags, folder, model, instructions). */
export function useUpdateChat() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.chats.update>[1] }) => api.chats.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["chats"] });
      qc.setQueriesData<ChatListResponse>({ queryKey: ["chats"], exact: false }, (list) =>
        list && "items" in list ? { ...list, items: list.items.map((c) => (c._id === id ? { ...c, ...patch } : c)) } : list,
      );
      qc.setQueryData<ChatDetail>(queryKeys.chat(id), (chat) => (chat ? { ...chat, ...patch } : chat));
    },
    onSuccess: (updated: ChatSummary) => {
      qc.setQueryData<ChatDetail>(queryKeys.chat(updated._id), (chat) => (chat ? { ...chat, ...updated } : chat));
      void qc.invalidateQueries({ queryKey: ["chats"], exact: false });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("common.error")),
  });
}

export function useDeleteChat() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => api.chats.remove(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: queryKeys.chat(id) });
      void qc.invalidateQueries({ queryKey: ["chats"], exact: false });
      toast.success(t("chat.deleted"));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("common.error")),
  });
}

export function useBulkDeleteChats() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (ids: string[]) => api.chats.bulkRemove(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["chats"], exact: false });
      toast.success(t("chat.deleted"));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("common.error")),
  });
}

export function useMessageFeedback(chatId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, feedback, note }: { messageId: string; feedback: "up" | "down" | null; note?: string }) => api.chats.feedback(chatId, messageId, feedback, note),
    onMutate: ({ messageId, feedback }) => {
      qc.setQueryData<ChatDetail>(queryKeys.chat(chatId), (chat) =>
        chat ? { ...chat, messages: chat.messages.map((m) => (m._id === messageId ? { ...m, feedback } : m)) } : chat,
      );
    },
  });
}

/** Downloads an export (md/json/pdf) through the authenticated API. */
export async function downloadExport(id: string, title: string, format: "md" | "json" | "pdf"): Promise<void> {
  const res = await api.chats.export(id, format);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^\w\- ]/g, "").trim() || "chat"}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
