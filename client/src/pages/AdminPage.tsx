import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, MessageSquare, MoreHorizontal, Shield, ThumbsDown, ThumbsUp, Trash2, UserCog, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { formatNumber, formatRelative } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { IconButton } from "@/components/ui/Button";
import { Badge, EmptyState, PageHeader, Skeleton, StatCard } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Form";
import { ConfirmDialog, PromptDialog } from "@/components/ui/Dialog";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { UsageChart } from "@/components/analytics/UsageChart";
import { ModelBars } from "./UsagePage";
import type { AdminUser } from "@/types/api";

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function Avatar({ user }: { user: AdminUser }) {
  const initials = (user.name || user.email || "?")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
  return user.imageUrl ? (
    <img src={user.imageUrl} alt="" className="size-9 rounded-full object-cover" />
  ) : (
    <div className="flex size-9 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-500">{initials}</div>
  );
}

export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { data: me } = useUser();
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [quotaTarget, setQuotaTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const locale = i18n.language;
  const isAdmin = me?.role === "admin";

  const stats = useQuery({ queryKey: queryKeys.adminStats, queryFn: api.admin.stats, enabled: isAdmin });
  const users = useQuery({ queryKey: queryKeys.adminUsers({ q }), queryFn: () => api.admin.users({ q: q || undefined, limit: 50 }), enabled: isAdmin });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
  };
  const onError = (err: unknown) => toast.error(err instanceof Error ? err.message : t("common.error"));

  const updateUser = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { role?: "user" | "admin"; dailyQuota?: number | null } }) => api.admin.updateUser(id, patch),
    onSuccess: () => {
      toast.success(t("admin.updated"));
      refresh();
    },
    onError,
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.admin.deleteUser(id),
    onSuccess: refresh,
    onError,
  });

  if (me && !isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <EmptyState
          icon={<Shield />}
          title={t("admin.forbidden")}
          action={
            <Link to="/dashboard" className="text-sm font-medium text-brand-500 underline underline-offset-4">
              {t("common.goHome")}
            </Link>
          }
        />
      </div>
    );
  }

  const s = stats.data;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 sm:p-6">
      <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} />

      {!s ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label={t("admin.users")} value={formatNumber(s.totals.users, locale)} icon={<Users />} />
            <StatCard label={t("admin.chats")} value={formatNumber(s.totals.chats, locale)} icon={<MessageSquare />} hint={`${formatNumber(s.totals.documents, locale)} ${t("usage.documents").toLowerCase()}`} />
            <StatCard label={t("admin.messages")} value={formatNumber(s.totals.messages, locale)} icon={<FileText />} />
            <StatCard label={t("admin.tokens")} value={formatNumber(s.totals.tokens, locale)} icon={<Zap />} />
            <div className="surface rounded-2xl p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{t("admin.feedback")}</div>
              <div className="mt-2 flex items-center gap-4 font-display text-2xl font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <ThumbsUp className="size-5" /> {s.feedback.up}
                </span>
                <span className="flex items-center gap-1.5 text-red-500">
                  <ThumbsDown className="size-5" /> {s.feedback.down}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
            <section className="surface rounded-2xl p-5">
              <h2 className="mb-4 font-display text-base font-semibold">{t("admin.activity")}</h2>
              <UsageChart data={s.daily.map((d) => ({ day: d.day, a: d.messages, b: d.activeUsers }))} labelA={t("admin.messages")} labelB={t("admin.users")} />
            </section>
            <section className="surface rounded-2xl p-5">
              <h2 className="mb-4 font-display text-base font-semibold">{t("usage.byModel")}</h2>
              {s.models.length > 0 ? <ModelBars models={s.models} /> : <p className="text-sm text-fg-muted">—</p>}
            </section>
          </div>
        </>
      )}

      <section className="surface flex flex-col gap-4 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold">{t("admin.users")}</h2>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.searchUsers")} className="max-w-xs" aria-label={t("admin.searchUsers")} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-fg-subtle">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">{t("admin.users")}</th>
                <th className="py-2 pr-3 font-medium">{t("admin.role")}</th>
                <th className="py-2 pr-3 font-medium">{t("admin.chats")}</th>
                <th className="py-2 pr-3 font-medium">{t("admin.messages")}</th>
                <th className="py-2 pr-3 font-medium">{t("admin.quota")}</th>
                <th className="py-2 pr-3 font-medium">{t("admin.lastSeen")}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.isPending &&
                Array.from({ length: 4 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-3">
                      <Skeleton className="h-9" />
                    </td>
                  </tr>
                ))}
              {users.data?.items.map((u) => (
                <tr key={u.id} className="hover:bg-bg-hover/50">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <Avatar user={u} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.name || "—"}</p>
                        <p className="truncate text-xs text-fg-muted">{u.email || u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge tone={u.role === "admin" ? "accent" : "neutral"}>{u.role}</Badge>
                  </td>
                  <td className="py-3 pr-3 tabular-nums">{formatNumber(u.chats, locale)}</td>
                  <td className="py-3 pr-3 tabular-nums">{formatNumber(u.messages, locale)}</td>
                  <td className="py-3 pr-3 tabular-nums">{u.dailyQuota ?? <span className="text-fg-muted">{t("admin.default")}</span>}</td>
                  <td className="py-3 pr-3 text-fg-muted">{formatRelative(u.lastSeenAt, locale)}</td>
                  <td className="py-3 text-right">
                    <Menu>
                      <MenuTrigger>
                        <IconButton label={t("admin.setQuota")} size="sm">
                          <MoreHorizontal />
                        </IconButton>
                      </MenuTrigger>
                      <MenuContent>
                        <MenuItem icon={<UserCog />} disabled={u.id === me?.id} onSelect={() => updateUser.mutate({ id: u.id, patch: { role: u.role === "admin" ? "user" : "admin" } })}>
                          {u.role === "admin" ? t("admin.makeUser") : t("admin.makeAdmin")}
                        </MenuItem>
                        <MenuItem icon={<Zap />} onSelect={() => setQuotaTarget(u)}>
                          {t("admin.setQuota")}
                        </MenuItem>
                        <MenuSeparator />
                        <MenuItem icon={<Trash2 />} danger disabled={u.id === me?.id} onSelect={() => setDeleteTarget(u)}>
                          {t("admin.deleteUser")}
                        </MenuItem>
                      </MenuContent>
                    </Menu>
                  </td>
                </tr>
              ))}
              {users.data && users.data.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-fg-muted">
                    {t("search.noResults")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <PromptDialog
        open={quotaTarget !== null}
        onClose={() => setQuotaTarget(null)}
        title={t("admin.setQuota")}
        initialValue={quotaTarget?.dailyQuota?.toString() ?? ""}
        placeholder={t("admin.default")}
        onSubmit={(value) => {
          if (!quotaTarget) return;
          const parsed = Number.parseInt(value, 10);
          updateUser.mutate({ id: quotaTarget.id, patch: { dailyQuota: Number.isFinite(parsed) && parsed > 0 ? parsed : null } });
        }}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => (deleteTarget ? deleteUser.mutateAsync(deleteTarget.id) : undefined)}
        title={t("admin.deleteUser")}
        description={`${t("admin.deleteUserConfirm")} ${deleteTarget?.email ?? ""}`}
        confirmLabel={t("common.delete")}
      />
    </div>
  );
}
