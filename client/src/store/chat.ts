import { create } from "zustand";
import { safeLocalStorage } from "@/lib/utils";
import type { GenerateOptions, Message, Source, ToolCall } from "@/types/api";

const storage = safeLocalStorage();
const OPTIONS_KEY = "koala:composer-options";

/** State of the answer currently being generated. */
export interface ActiveGeneration {
  chatId: string | null;
  /** Optimistic user message shown while the server answers (absent for regenerate). */
  userMessage: Message | null;
  /** Id of the user message being answered; messages after it are hidden during regenerate/edit. */
  answeringMessageId: string | null;
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

  begin: (gen: Omit<ActiveGeneration, "text" | "sources" | "toolCalls" | "error">, controller: AbortController) => void;
  appendText: (text: string) => void;
  addSources: (sources: Source[]) => void;
  addToolCall: (call: ToolCall) => void;
  setChatId: (chatId: string) => void;
  setModel: (model: string) => void;
  fail: (message: string) => void;
  finish: () => void;
  clear: () => void;
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

  begin: (gen, controller) => set({ active: { ...gen, text: "", sources: [], toolCalls: [], error: null }, streaming: true, controller }),
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
  setChatId: (chatId) => {
    const active = get().active;
    if (active) set({ active: { ...active, chatId } });
  },
  setModel: (model) => {
    const active = get().active;
    if (active) set({ active: { ...active, model } });
  },
  fail: (message) => {
    const active = get().active;
    set({ active: active ? { ...active, error: message } : null, streaming: false, controller: null });
  },
  finish: () => set({ active: null, streaming: false, controller: null }),
  clear: () => set({ active: null, streaming: false, controller: null }),
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
