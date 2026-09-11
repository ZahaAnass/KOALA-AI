import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/clerk-react";
import { Download, RotateCcw, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { modKey } from "@/lib/utils";
import { setLocale } from "@/i18n";
import { useUi } from "@/store/ui";
import { useModels, useUpdateSettings, useUser } from "@/hooks/useUser";
import { useInstallPrompt } from "@/hooks/usePwa";
import { Button } from "@/components/ui/Button";
import { Kbd, PageHeader, Skeleton } from "@/components/ui/Feedback";
import { Field, SegmentedControl, Select, Slider, Switch, Textarea } from "@/components/ui/Form";
import { ConfirmDialog } from "@/components/ui/Dialog";
import type { Locale, SafetyLevel, Settings, Theme } from "@/types/api";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="surface rounded-2xl p-5">
      <h2 className="mb-4 font-display text-base font-semibold">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

const SAFETY_LEVELS: SafetyLevel[] = ["off", "low", "medium", "high"];

export default function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signOut } = useClerk();
  const { data: user } = useUser();
  const { data: modelsData } = useModels();
  const update = useUpdateSettings();
  const { canInstall, install } = useInstallPrompt();
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);

  const [instruction, setInstruction] = useState("");
  const [clearOpen, setClearOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (user) setInstruction(user.settings.systemInstruction);
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-40" />
      </div>
    );
  }

  const settings = user.settings;
  const save = (patch: Partial<Settings>) => update.mutate(patch, { onSuccess: () => toast.success(t("settings.saved")) });

  const changeTheme = (value: Theme) => {
    setTheme(value);
    save({ theme: value });
  };
  const changeLocale = (value: Locale) => {
    setLocale(value);
    save({ locale: value });
  };

  const replayTour = () => {
    localStorage.removeItem("koala:tour-done");
    navigate("/dashboard?tour=1");
  };

  const clearChats = async () => {
    await api.chats.clear();
    await queryClient.invalidateQueries({ queryKey: ["chats"] });
  };

  const deleteAccount = async () => {
    await api.users.deleteAccount();
    toast.success(t("settings.accountDeleted"));
    await signOut();
    navigate("/");
  };

  const shortcuts: Array<{ keys: string[]; label: string }> = [
    { keys: [modKey, "K"], label: t("shortcuts.search") },
    { keys: [modKey, "Shift", "O"], label: t("shortcuts.newChat") },
    { keys: [modKey, "B"], label: t("shortcuts.toggleSidebar") },
    { keys: ["Esc"], label: t("shortcuts.stop") },
    { keys: ["/"], label: t("shortcuts.focus") },
    { keys: [modKey, "Shift", "L"], label: t("shortcuts.theme") },
    { keys: ["?"], label: t("shortcuts.help") },
  ];

  const quota = user.quota;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-6">
      <PageHeader title={t("settings.title")} />

      <Section title={t("settings.general")}>
        <Field label={t("theme.label")}>
          <SegmentedControl<Theme>
            value={theme}
            onChange={changeTheme}
            options={[
              { value: "system", label: t("theme.system") },
              { value: "light", label: t("theme.light") },
              { value: "dark", label: t("theme.dark") },
            ]}
          />
        </Field>
        <Field label={t("language.label")}>
          <SegmentedControl<Locale>
            value={settings.locale}
            onChange={changeLocale}
            options={[
              { value: "en", label: t("language.en") },
              { value: "fr", label: t("language.fr") },
            ]}
          />
        </Field>
        {canInstall && (
          <Field label={t("settings.installApp")} hint={t("settings.installHint")}>
            <Button variant="outline" leftIcon={<Download className="size-4" />} onClick={() => void install()} className="self-start">
              {t("settings.installApp")}
            </Button>
          </Field>
        )}
        <Button variant="ghost" leftIcon={<RotateCcw className="size-4" />} onClick={replayTour} className="self-start">
          {t("settings.replayTour")}
        </Button>
      </Section>

      <Section title={t("settings.model")}>
        <Field label={t("settings.defaultModel")} htmlFor="default-model">
          <Select id="default-model" value={settings.model} onChange={(e) => save({ model: e.target.value })}>
            {(modelsData?.models ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} · {m.description}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("settings.systemInstruction")} hint={t("settings.systemInstructionHint")} htmlFor="system-instruction">
          <Textarea id="system-instruction" value={instruction} maxLength={4000} onChange={(e) => setInstruction(e.target.value)} />
          <Button size="sm" className="self-end" disabled={instruction === settings.systemInstruction} loading={update.isPending} onClick={() => save({ systemInstruction: instruction })}>
            {t("common.save")}
          </Button>
        </Field>
        <Field label={t("settings.temperature")} hint={t("settings.temperatureHint")}>
          <Slider value={settings.temperature} min={0} max={2} step={0.1} onChange={(v) => save({ temperature: Number(v.toFixed(1)) })} format={(v) => v.toFixed(1)} />
        </Field>
        <Field label={t("settings.maxTokens")}>
          <Slider value={settings.maxOutputTokens} min={256} max={16384} step={256} onChange={(v) => save({ maxOutputTokens: v })} />
        </Field>
        <Field label={t("settings.safety")} hint={t("settings.safetyHint")}>
          <SegmentedControl<SafetyLevel>
            value={settings.safetyLevel}
            onChange={(v) => save({ safetyLevel: v })}
            options={SAFETY_LEVELS.map((level) => ({ value: level, label: t(`settings.safety_${level}`) }))}
          />
        </Field>
        <Switch checked={settings.followUps} onChange={(v) => save({ followUps: v })} label={t("settings.followUps")} />
        <Switch checked={settings.webSearch} onChange={(v) => save({ webSearch: v })} label={t("settings.webSearch")} />
        <Switch checked={settings.tools} onChange={(v) => save({ tools: v })} label={t("settings.tools")} />
        <Switch checked={settings.useDocuments} onChange={(v) => save({ useDocuments: v })} label={t("settings.useDocuments")} />
      </Section>

      <Section title={t("settings.quotaTitle")}>
        {quota.limit === null ? (
          <p className="text-sm text-fg-muted">{t("settings.quotaUnlimited")}</p>
        ) : (
          <>
            <p className="text-sm text-fg-muted">{t("settings.quotaText", { used: quota.usedToday, limit: quota.limit })}</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg-muted">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.min(100, (quota.usedToday / quota.limit) * 100)}%` }} />
            </div>
          </>
        )}
      </Section>

      <Section title={t("settings.shortcuts")}>
        <ul className="divide-y divide-border">
          {shortcuts.map((s) => (
            <li key={s.label} className="flex items-center justify-between py-2 text-sm">
              <span>{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t("settings.dangerZone")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm">{t("settings.clearHistory")}</span>
          <Button variant="danger" size="sm" leftIcon={<Trash2 className="size-4" />} onClick={() => setClearOpen(true)}>
            {t("settings.clearHistory")}
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm">{t("settings.deleteAccount")}</p>
            <p className="text-xs text-fg-muted">{t("settings.deleteAccountHint")}</p>
          </div>
          <Button variant="danger" size="sm" leftIcon={<UserX className="size-4" />} onClick={() => setDeleteOpen(true)}>
            {t("settings.deleteAccount")}
          </Button>
        </div>
      </Section>

      <ConfirmDialog open={clearOpen} onClose={() => setClearOpen(false)} onConfirm={clearChats} title={t("settings.clearHistory")} description={t("chat.clearAllConfirm")} confirmLabel={t("common.delete")} />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteAccount}
        title={t("settings.deleteAccount")}
        description={`${t("settings.deleteAccountHint")} ${t("settings.deleteAccountConfirm")}`}
        confirmLabel={t("common.delete")}
        typeToConfirm="DELETE"
      />
    </div>
  );
}
