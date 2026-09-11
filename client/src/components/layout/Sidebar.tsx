import { useMemo, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { Archive, BarChart3, BookText, CheckSquare, FileText, FolderOpen, Pin, Plus, Search, Settings, ShieldCheck, Square, Tag, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBulkDeleteChats, useChatList, useChatMeta } from "@/hooks/useChats";
import { useUser } from "@/hooks/useUser";
import { cn, groupByPeriod, modKey } from "@/lib/utils";
import { useUi } from "@/store/ui";
import type { ChatSummary } from "@/types/api";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Kbd, Skeleton } from "@/components/ui/Feedback";
import { ChatMenu } from "@/components/chat/ChatMenu";

type Filter = { kind: "all" } | { kind: "archived" } | { kind: "folder"; value: string } | { kind: "tag"; value: string };

/** Navigation, chat history with grouping/filters, and bulk actions. */
export function Sidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: currentId } = useParams();
  const { data: user } = useUser();
  const setPaletteOpen = useUi((s) => s.setPaletteOpen);
  const setSidebarOpen = useUi((s) => s.setSidebarOpen);

  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);

  const query = useChatList({
    archived: filter.kind === "archived",
    folder: filter.kind === "folder" ? filter.value : undefined,
    tag: filter.kind === "tag" ? filter.value : undefined,
  });
  const { data: meta } = useChatMeta();
  const bulkDelete = useBulkDeleteChats();

  const chats = useMemo(() => query.data?.items ?? [], [query.data]);
  const pinned = useMemo(() => chats.filter((c) => c.pinned), [chats]);
  const groups = useMemo(
    () =>
      groupByPeriod(
        chats.filter((c) => !c.pinned),
        { today: t("nav.today"), yesterday: t("nav.yesterday"), week: t("nav.thisWeek"), month: t("nav.thisMonth"), older: t("nav.older") },
      ),
    [chats, t],
  );

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const closeOnMobile = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const navItems = [
    { to: "/documents", icon: <FileText />, label: t("nav.documents") },
    { to: "/prompts", icon: <BookText />, label: t("nav.prompts") },
    { to: "/usage", icon: <BarChart3 />, label: t("nav.usage") },
    { to: "/settings", icon: <Settings />, label: t("nav.settings") },
    ...(user?.role === "admin" ? [{ to: "/admin", icon: <ShieldCheck />, label: t("nav.admin") }] : []),
  ];

  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-bg-elevated/60">
      <div className="flex items-center justify-between px-3 pt-3">
        <NavLink to="/" className="flex items-center gap-2 px-1 font-display text-sm font-semibold">
          <img src="/logo.png" alt="" className="size-7" />
          {t("app.name")}
        </NavLink>
        <IconButton size="sm" label={t("nav.toggleSidebar")} onClick={() => setSidebarOpen(false)} className="lg:hidden">
          <X />
        </IconButton>
      </div>

      <div className="flex flex-col gap-1 p-3">
        <Button
          variant="primary"
          className="w-full justify-start"
          leftIcon={<Plus className="size-4" />}
          onClick={() => {
            navigate("/dashboard");
            closeOnMobile();
          }}
        >
          {t("nav.newChat")}
          <span className="ml-auto hidden items-center gap-0.5 opacity-70 lg:flex">
            <Kbd>{modKey}</Kbd>
            <Kbd>⇧</Kbd>
            <Kbd>O</Kbd>
          </span>
        </Button>
        <Button variant="ghost" className="w-full justify-start text-fg-muted" leftIcon={<Search className="size-4" />} onClick={() => setPaletteOpen(true)}>
          {t("nav.search")}
          <span className="ml-auto hidden items-center gap-0.5 lg:flex">
            <Kbd>{modKey}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 px-3 pb-2 text-xs">
        <FilterChip active={filter.kind === "all"} onClick={() => setFilter({ kind: "all" })} icon={<Pin className="size-3" />}>
          {t("nav.recent")}
        </FilterChip>
        <FilterChip active={filter.kind === "archived"} onClick={() => setFilter({ kind: "archived" })} icon={<Archive className="size-3" />}>
          {t("nav.archived")}
        </FilterChip>
        {(meta?.folders ?? []).map((folder) => (
          <FilterChip key={folder} active={filter.kind === "folder" && filter.value === folder} onClick={() => setFilter({ kind: "folder", value: folder })} icon={<FolderOpen className="size-3" />}>
            {folder}
          </FilterChip>
        ))}
        {(meta?.tags ?? []).map((tag) => (
          <FilterChip key={tag} active={filter.kind === "tag" && filter.value === tag} onClick={() => setFilter({ kind: "tag", value: tag })} icon={<Tag className="size-3" />}>
            {tag}
          </FilterChip>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
        <span>{t("nav.chats")}</span>
        {chats.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSelecting(!selecting);
              setSelected(new Set());
            }}
            className="inline-flex items-center gap-1 rounded px-1 normal-case text-fg-muted hover:text-fg"
          >
            <CheckSquare className="size-3" /> {selecting ? t("common.cancel") : t("chat.selectMode")}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {query.isPending ? (
          <div className="flex flex-col gap-2 px-2 py-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-fg-muted">
            <p className="font-medium text-fg">{t("nav.noChats")}</p>
            <p className="mt-1">{t("nav.noChatsHint")}</p>
          </div>
        ) : (
          <>
            {pinned.length > 0 && <ChatGroup label={t("nav.pinned")} items={pinned} currentId={currentId} selecting={selecting} selected={selected} onToggle={toggleSelect} onOpen={closeOnMobile} />}
            {groups.map((g) => (
              <ChatGroup key={g.label} label={g.label} items={g.items} currentId={currentId} selecting={selecting} selected={selected} onToggle={toggleSelect} onOpen={closeOnMobile} />
            ))}
          </>
        )}
      </nav>

      {selecting && selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs">
          <span className="text-fg-muted">{t("chat.selected", { count: selected.size })}</span>
          <Button size="sm" variant="danger" leftIcon={<Trash2 className="size-3.5" />} onClick={() => setConfirmBulk(true)}>
            {t("chat.deleteSelected")}
          </Button>
        </div>
      )}

      <div className="border-t border-border p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={closeOnMobile}
            className={({ isActive }) => cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors [&>svg]:size-4", isActive ? "bg-bg-hover text-fg" : "text-fg-muted hover:bg-bg-hover hover:text-fg")}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </div>

      <ConfirmDialog
        open={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        title={t("chat.deleteSelected")}
        description={t("chat.deleteConfirm")}
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          const ids = Array.from(selected);
          await bulkDelete.mutateAsync(ids);
          setSelected(new Set());
          setSelecting(false);
          if (currentId && ids.includes(currentId)) navigate("/dashboard");
        }}
      />
    </aside>
  );
}

function FilterChip({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 transition-colors", active ? "border-brand-500 bg-brand-500/10 text-brand-500" : "border-border text-fg-muted hover:border-border-strong hover:text-fg")}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

function ChatGroup({ label, items, currentId, selecting, selected, onToggle, onOpen }: { label: string; items: ChatSummary[]; currentId?: string; selecting: boolean; selected: Set<string>; onToggle: (id: string) => void; onOpen: () => void }) {
  return (
    <div className="mb-2">
      <div className="px-2 py-1 text-[11px] font-medium text-fg-subtle">{label}</div>
      {items.map((chat) => {
        const active = chat._id === currentId;
        const checked = selected.has(chat._id);
        return (
          <div key={chat._id} className={cn("group/item relative flex items-center rounded-lg pr-1 transition-colors", active ? "bg-bg-hover" : "hover:bg-bg-hover")}>
            {selecting && (
              <button type="button" onClick={() => onToggle(chat._id)} aria-label={chat.title} className="pl-2 text-fg-muted">
                {checked ? <CheckSquare className="size-4 text-brand-500" /> : <Square className="size-4" />}
              </button>
            )}
            <NavLink to={`/dashboard/chats/${chat._id}`} onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-sm">
              {chat.pinned && <Pin className="size-3 shrink-0 text-brand-500" />}
              <span className={cn("truncate", active ? "text-fg" : "text-fg-muted group-hover/item:text-fg")}>{chat.title}</span>
              {chat.shareToken && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-emerald-500" title="Shared" />}
            </NavLink>
            <div className={cn("opacity-0 transition-opacity group-hover/item:opacity-100 focus-within:opacity-100", active && "opacity-100")}>
              <ChatMenu chat={chat} isCurrent={active} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
