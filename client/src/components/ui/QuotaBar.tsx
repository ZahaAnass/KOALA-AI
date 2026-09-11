import { useTranslation } from "react-i18next";
import type { Quota } from "@/types/api";

/** Daily message allowance with a progress bar, or an "unlimited" note. */
export function QuotaBar({ quota }: { quota: Quota }) {
  const { t } = useTranslation();
  if (quota.limit === null) return <p className="text-sm text-fg-muted">{t("settings.quotaUnlimited")}</p>;
  const percent = Math.min(100, (quota.usedToday / quota.limit) * 100);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-fg-muted">{t("settings.quotaText", { used: quota.usedToday, limit: quota.limit })}</p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={quota.limit} aria-valuenow={quota.usedToday}>
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
