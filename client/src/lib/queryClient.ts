import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // Never retry auth/validation errors; retry network/server errors twice.
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  me: ["me"] as const,
  models: ["models"] as const,
  chats: (params: Record<string, unknown> = {}) => ["chats", params] as const,
  chatsMeta: ["chats", "meta"] as const,
  chat: (id: string) => ["chat", id] as const,
  documents: ["documents"] as const,
  prompts: ["prompts"] as const,
  usage: (days: number) => ["usage", days] as const,
  adminStats: ["admin", "stats"] as const,
  adminUsers: (params: Record<string, unknown> = {}) => ["admin", "users", params] as const,
  shared: (token: string) => ["shared", token] as const,
};
