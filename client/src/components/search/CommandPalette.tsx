import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BarChart3, FileText, MessageSquare, Plus, Search, Settings, SunMoon, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { useDebounced } from "@/hooks/useDebounced";
import { cn, formatRelative } from "@/lib/utils";
import { useUi } from "@/store/ui";
import { Dialog } from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/Feedback";

interface Item {
  id: string;
  section: "actions" | "chats";
  icon: ReactNode;
  label: string;
  hint?: string;
  run: () => void;
}

/** Global search and command palette (⌘K / Ctrl+K). */
export function CommandPalette() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const open = useUi((s) => s.paletteOpen);
  const setOpen = useUi((s) => s.setPaletteOpen);
  const cycleTheme = useUi((s) => s.cycleTheme);

  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounced(query.trim(), 200);

  const { data } = useQuery({
    queryKey: queryKeys.chats({ palette: true, q: debounced }),
    queryFn: () => (debounced ? api.chats.list({ q: debounced, limit: 8 }) : api.chats.list({ limit: 6 })),
    enabled: open,
  });

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, [setOpen]);
  const go = useCallback(
    (path: string) => {
      close();
      navigate(path);
    },
    [close, navigate],
  );

  const items = useMemo<Item[]>(() => {
    const actions: Item[] = [
      { id: "new", section: "actions", icon: <Plus />, label: t("search.newChat"), run: () => go("/dashboard") },
      {
        id: "theme",
        section: "actions",
        icon: <SunMoon />,
        label: t("search.toggleTheme"),
        run: () => {
          cycleTheme();
          close();
        },
      },
      { id: "settings", section: "actions", icon: <Settings />, label: t("search.openSettings"), run: () => go("/settings") },
      { id: "documents", section: "actions", icon: <FileText />, label: t("search.openDocuments"), run: () => go("/documents") },
      { id: "prompts", section: "actions", icon: <Sparkles />, label: t("search.openPrompts"), run: () => go("/prompts") },
      { id: "usage", section: "actions", icon: <BarChart3 />, label: t("search.openUsage"), run: () => go("/usage") },
    ];
    const q = query.trim().toLowerCase();
    const filteredActions = q ? actions.filter((a) => a.label.toLowerCase().includes(q)) : actions;
    const chats: Item[] = (data?.items ?? []).map((c) => ({
      id: c._id,
      section: "chats",
      icon: <MessageSquare />,
      label: c.title,
      hint: c.snippet || formatRelative(c.lastMessageAt, i18n.language),
      run: () => go(`/dashboard/chats/${c._id}`),
    }));
    return [...filteredActions, ...chats];
  }, [data, query, t, i18n.language, go, close, cycleTheme]);

  useEffect(() => setHighlight(0), [items.length, query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[highlight]?.run();
    }
  };

  const sections: Array<{ key: Item["section"]; label: string }> = [
    { key: "actions", label: t("search.actions") },
    { key: "chats", label: query.trim() ? t("search.chats") : t("search.recent") },
  ];

  return (
    <Dialog open={open} onClose={close} size="md" className="overflow-hidden" aria-label={t("search.title")}>
      <div className="-mx-6 -my-5" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-fg-subtle" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            aria-label={t("search.title")}
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-subtle"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2" role="listbox">
          {items.length === 0 && <p className="px-3 py-8 text-center text-sm text-fg-muted">{t("search.noResults")}</p>}
          {sections.map((section) => {
            const rows = items.filter((i) => i.section === section.key);
            if (rows.length === 0) return null;
            return (
              <div key={section.key} className="mb-1">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{section.label}</p>
                {rows.map((item) => {
                  const index = items.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={index === highlight}
                      data-index={index}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={item.run}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-fg-subtle",
                        index === highlight ? "bg-bg-hover" : "hover:bg-bg-muted",
                      )}
                    >
                      {item.icon}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{item.label}</span>
                        {item.hint && <span className="block truncate text-xs text-fg-muted">{item.hint}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
