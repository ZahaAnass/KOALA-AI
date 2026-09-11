import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { FileText, MessageSquare, MessagesSquare, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { formatNumber } from "@/lib/utils";
import { PageHeader, Skeleton, StatCard } from "@/components/ui/Feedback";
import { SegmentedControl } from "@/components/ui/Form";
import { UsageChart } from "@/components/analytics/UsageChart";

type Range = "7" | "30" | "90";

export function ModelBars({ models }: { models: Array<{ model: string; count: number }> }) {
  const max = Math.max(1, ...models.map((m) => m.count));
  return (
    <ul className="flex flex-col gap-3">
      {models.map((m) => (
        <li key={m.model} className="flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span className="truncate font-mono text-xs">{m.model}</span>
            <span className="text-fg-muted">{formatNumber(m.count)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${(m.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function UsagePage() {
  const { t, i18n } = useTranslation();
  const [range, setRange] = useState<Range>("30");
  const days = Number(range);
  const { data, isPending } = useQuery({ queryKey: queryKeys.usage(days), queryFn: () => api.users.usage(days) });
  const locale = i18n.language;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        title={t("usage.title")}
        subtitle={t("usage.subtitle", { days })}
        actions={
          <SegmentedControl<Range>
            value={range}
            onChange={setRange}
            size="sm"
            options={[
              { value: "7", label: t("usage.range7") },
              { value: "30", label: t("usage.range30") },
              { value: "90", label: t("usage.range90") },
            ]}
          />
        }
      />

      {isPending || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("usage.messages")} value={formatNumber(data.totals.messages, locale)} icon={<MessageSquare />} />
            <StatCard label={t("usage.chats")} value={formatNumber(data.totals.chats, locale)} icon={<MessagesSquare />} />
            <StatCard label={t("usage.tokens")} value={formatNumber(data.totals.tokens, locale)} icon={<Zap />} />
            <StatCard label={t("usage.documents")} value={formatNumber(data.totals.documents, locale)} icon={<FileText />} />
          </div>

          <section className="surface rounded-2xl p-5">
            <h2 className="mb-4 font-display text-base font-semibold">{t("usage.perDay")}</h2>
            <UsageChart data={data.series.map((s) => ({ day: s.day, a: s.user, b: s.model }))} labelA={t("usage.you")} labelB={t("usage.assistant")} />
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="surface rounded-2xl p-5">
              <h2 className="mb-4 font-display text-base font-semibold">{t("usage.byModel")}</h2>
              {data.models.length > 0 ? <ModelBars models={data.models} /> : <p className="text-sm text-fg-muted">—</p>}
            </section>
            <section className="surface rounded-2xl p-5">
              <h2 className="mb-4 font-display text-base font-semibold">{t("settings.quotaTitle")}</h2>
              {data.quota.limit === null ? (
                <p className="text-sm text-fg-muted">{t("settings.quotaUnlimited")}</p>
              ) : (
                <>
                  <p className="mb-3 text-sm text-fg-muted">{t("settings.quotaText", { used: data.quota.usedToday, limit: data.quota.limit })}</p>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg-muted">
                    <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.min(100, (data.quota.usedToday / data.quota.limit) * 100)}%` }} />
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
