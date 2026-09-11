import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
export const modKey = isMac ? "⌘" : "Ctrl";

export function formatRelative(date: string | Date, locale = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diff < 60) return rtf.format(-Math.round(diff), "second");
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  if (diff < 86400 * 30) return rtf.format(-Math.round(diff / 86400), "day");
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d);
}

export function formatNumber(n: number, locale = "en"): string {
  return new Intl.NumberFormat(locale, { notation: n >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Group chats by relative period for the sidebar. */
export function groupByPeriod<T extends { lastMessageAt: string }>(items: T[], labels: { today: string; yesterday: string; week: string; month: string; older: string }) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const groups: Array<{ label: string; items: T[] }> = [
    { label: labels.today, items: [] },
    { label: labels.yesterday, items: [] },
    { label: labels.week, items: [] },
    { label: labels.month, items: [] },
    { label: labels.older, items: [] },
  ];
  for (const item of items) {
    const t = new Date(item.lastMessageAt).getTime();
    const idx = t >= startOfDay ? 0 : t >= startOfDay - 86400e3 ? 1 : t >= startOfDay - 6 * 86400e3 ? 2 : t >= startOfDay - 29 * 86400e3 ? 3 : 4;
    groups[idx]!.items.push(item);
  }
  return groups.filter((g) => g.items.length > 0);
}

export const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/i;

export function extractFirstUrl(text: string): string | null {
  return text.match(URL_REGEX)?.[0] ?? null;
}

export function safeLocalStorage() {
  try {
    return {
      get: (k: string) => localStorage.getItem(k),
      set: (k: string, v: string) => localStorage.setItem(k, v),
      remove: (k: string) => localStorage.removeItem(k),
    };
  } catch {
    return { get: () => null, set: () => undefined, remove: () => undefined };
  }
}
