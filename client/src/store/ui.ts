import { create } from "zustand";
import { safeLocalStorage } from "@/lib/utils";
import type { Theme } from "@/types/api";

const storage = safeLocalStorage();

interface UiState {
  sidebarOpen: boolean;
  theme: Theme;
  paletteOpen: boolean;
  shortcutsOpen: boolean;
  /** Text queued to be inserted into the composer (from templates, follow-ups, URL summaries). */
  composerInsert: string | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
  setPaletteOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  insertIntoComposer: (text: string) => void;
  consumeComposerInsert: () => string | null;
}

function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  storage.set("koala:theme", theme);
}

const initialTheme = ((storage.get("koala:theme") as Theme | null) ?? "system") satisfies Theme;
const initialSidebar = storage.get("koala:sidebar") !== "closed" && window.innerWidth >= 1024;

export const useUi = create<UiState>((set, get) => ({
  sidebarOpen: initialSidebar,
  theme: initialTheme,
  paletteOpen: false,
  shortcutsOpen: false,
  composerInsert: null,

  setSidebarOpen: (open) => {
    storage.set("koala:sidebar", open ? "open" : "closed");
    set({ sidebarOpen: open });
  },
  toggleSidebar: () => get().setSidebarOpen(!get().sidebarOpen),

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  cycleTheme: () => {
    const order: Theme[] = ["light", "dark", "system"];
    const next = order[(order.indexOf(get().theme) + 1) % order.length]!;
    get().setTheme(next);
  },

  setPaletteOpen: (open) => set({ paletteOpen: open }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),

  insertIntoComposer: (text) => set({ composerInsert: text }),
  consumeComposerInsert: () => {
    const text = get().composerInsert;
    if (text !== null) set({ composerInsert: null });
    return text;
  },
}));

// Keep "system" theme in sync with the OS.
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (useUi.getState().theme === "system") applyTheme("system");
});
applyTheme(initialTheme);
