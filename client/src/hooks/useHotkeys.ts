import { useEffect } from "react";

export interface Hotkey {
  /** Key value as reported by KeyboardEvent.key, case-insensitive (e.g. "k", "Escape", "/"). */
  key: string;
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Fire even when focus is in an input/textarea. Defaults to false unless `mod` is set. */
  global?: boolean;
  handler: (event: KeyboardEvent) => void;
}

const isEditable = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
};

/** Registers keyboard shortcuts for the lifetime of the component. */
export function useHotkeys(hotkeys: Hotkey[], enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      for (const hk of hotkeys) {
        const modPressed = event.metaKey || event.ctrlKey;
        if (Boolean(hk.mod) !== modPressed) continue;
        if (Boolean(hk.shift) !== event.shiftKey) continue;
        if (Boolean(hk.alt) !== event.altKey) continue;
        if (event.key.toLowerCase() !== hk.key.toLowerCase()) continue;
        if (!(hk.global ?? hk.mod) && isEditable(event.target)) continue;
        event.preventDefault();
        hk.handler(event);
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hotkeys, enabled]);
}
