import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { FileText, MessageSquare, MessagesSquare, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { formatNumber } from "@/lib/utils";
import { PageHeader, Skeleton, StatCard } from "@/components/ui/Feedback";
import { SegmentedControl } from "@/components/ui/Form";
import { QuotaBar } from "@/components/ui/QuotaBar";
import { Section } from "@/components/ui/Section";
import { ModelBars } from "@/components/analytics/ModelBars";
import { UsageChart } from "@/components/analytics/UsageChart";

type Range = "7" | "30" | "90";

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
            aria-label={t("usage.title")}
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

          <Section title={t("usage.perDay")}>
            <UsageChart data={data.series.map((s) => ({ day: s.day, a: s.user, b: s.model }))} labelA={t("usage.you")} labelB={t("usage.assistant")} />
          </Section>

          <div className="grid gap-5 md:grid-cols-2">
            <Section title={t("usage.byModel")}>{data.models.length > 0 ? <ModelBars models={data.models} /> : <p className="text-sm text-fg-muted">—</p>}</Section>
            <Section title={t("settings.quotaTitle")}>
              <QuotaBar quota={data.quota} />
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
