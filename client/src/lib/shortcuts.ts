import { modKey } from "./utils";

export interface Shortcut {
  keys: string[];
  /** i18n key under `shortcuts.*`. */
  labelKey: string;
}

/** Keyboard shortcuts shown in the help dialog and the settings page. */
export const SHORTCUTS: Shortcut[] = [
  { keys: [modKey, "K"], labelKey: "shortcuts.search" },
  { keys: [modKey, "⇧", "O"], labelKey: "shortcuts.newChat" },
  { keys: [modKey, "B"], labelKey: "shortcuts.toggleSidebar" },
  { keys: [modKey, "⇧", "L"], labelKey: "shortcuts.theme" },
  { keys: ["/"], labelKey: "shortcuts.focus" },
  { keys: ["Esc"], labelKey: "shortcuts.stop" },
  { keys: ["?"], labelKey: "shortcuts.help" },
];
