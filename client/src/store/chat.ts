import { create } from "zustand";
import { safeLocalStorage } from "@/lib/utils";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import type { GenerateOptions, Message, Source, ToolCall } from "@/types/api";

const storage = safeLocalStorage();
const OPTIONS_KEY = STORAGE_KEYS.composerOptions;

/** State of the answer currently being generated. */
export interface ActiveGeneration {
  chatId: string | null;
  /** Optimistic user message shown while the server answers (absent for regenerate). */
  userMessage: Message | null;
  /** Id of the user message being answered; messages after it are hidden during regenerate/edit. */
  answeringMessageId: string | null;
  /** Server id of the user message once persisted (from the `meta` event). */
  userMessageId: string | null;
  text: string;
  sources: Source[];
  toolCalls: ToolCall[];
  model: string;
  error: string | null;
}

/** Composer toggles that persist across chats. */
export type ComposerOptions = Pick<GenerateOptions, "model" | "webSearch" | "tools" | "useDocuments">;

interface ChatState {
  active: ActiveGeneration | null;
  streaming: boolean;
  controller: AbortController | null;
  followUps: Record<string, string[]>;
  options: ComposerOptions;

  begin: (gen: Omit<ActiveGeneration, "text" | "sources" | "toolCalls" | "error" | "userMessageId">, controller: AbortController) => void;
  appendText: (text: string) => void;
  addSources: (sources: Source[]) => void;
  addToolCall: (call: ToolCall) => void;
  /** Records ids and model from the `meta` event once the server persisted the user message. */
  setMeta: (meta: { chatId: string; userMessageId: string; model: string }) => void;
  /** Marks the generation as failed. The optimistic user message is dropped when it was persisted. */
  fail: (message: string) => void;
  finish: () => void;
  stop: () => void;
  setFollowUps: (chatId: string, items: string[]) => void;
  setOptions: (patch: Partial<ComposerOptions>) => void;
}

function loadOptions(): ComposerOptions {
  try {
    return JSON.parse(storage.get(OPTIONS_KEY) ?? "{}") as ComposerOptions;
  } catch {
    return {};
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
  active: null,
  streaming: false,
  controller: null,
  followUps: {},
  options: loadOptions(),

  begin: (gen, controller) => set({ active: { ...gen, userMessageId: null, text: "", sources: [], toolCalls: [], error: null }, streaming: true, controller }),
  appendText: (text) => {
    const active = get().active;
    if (active) set({ active: { ...active, text: active.text + text } });
  },
  addSources: (sources) => {
    const active = get().active;
    if (active) set({ active: { ...active, sources: [...active.sources, ...sources] } });
  },
  addToolCall: (call) => {
    const active = get().active;
    if (active) set({ active: { ...active, toolCalls: [...active.toolCalls, call] } });
  },
  setMeta: ({ chatId, userMessageId, model }) => {
    const active = get().active;
    if (active) set({ active: { ...active, chatId, userMessageId, model } });
  },
  fail: (message) => {
    const active = get().active;
    if (!active) return set({ streaming: false, controller: null });
    // Once persisted, the real message comes back from the server, so the optimistic copy is dropped.
    const persisted = active.userMessageId !== null;
    set({
      active: { ...active, error: message, userMessage: persisted ? null : active.userMessage, answeringMessageId: active.answeringMessageId ?? active.userMessageId },
      streaming: false,
      controller: null,
    });
  },
  finish: () => set({ active: null, streaming: false, controller: null }),
  stop: () => {
    get().controller?.abort();
  },
  setFollowUps: (chatId, items) => set((s) => ({ followUps: { ...s.followUps, [chatId]: items } })),
  setOptions: (patch) => {
    const options = { ...get().options, ...patch };
    storage.set(OPTIONS_KEY, JSON.stringify(options));
    set({ options });
  },
}));
