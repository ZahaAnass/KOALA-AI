import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/clerk-react";
import { Download, RotateCcw, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { SHORTCUTS } from "@/lib/shortcuts";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { safeLocalStorage } from "@/lib/utils";
import { setLocale } from "@/i18n";
import { useUi } from "@/store/ui";
import { useModels, useUpdateSettings, useUser } from "@/hooks/useUser";
import { useInstallPrompt } from "@/hooks/usePwa";
import { Button } from "@/components/ui/Button";
import { Kbd, PageHeader, Skeleton } from "@/components/ui/Feedback";
import { Field, SegmentedControl, Select, Slider, Switch, Textarea } from "@/components/ui/Form";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { QuotaBar } from "@/components/ui/QuotaBar";
import { Section } from "@/components/ui/Section";
import type { Locale, SafetyLevel, Settings, Theme } from "@/types/api";

const SAFETY_LEVELS: SafetyLevel[] = ["off", "low", "medium", "high"];
const storage = safeLocalStorage();

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
    storage.remove(STORAGE_KEYS.tourDone);
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-6">
      <PageHeader title={t("settings.title")} />

      <Section title={t("settings.general")}>
        <Field label={t("theme.label")}>
          <SegmentedControl<Theme>
            value={theme}
            onChange={changeTheme}
            aria-label={t("theme.label")}
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
            aria-label={t("language.label")}
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
          <Slider aria-label={t("settings.temperature")} value={settings.temperature} min={0} max={2} step={0.1} onChange={(v) => save({ temperature: Number(v.toFixed(1)) })} format={(v) => v.toFixed(1)} />
        </Field>
        <Field label={t("settings.maxTokens")}>
          <Slider aria-label={t("settings.maxTokens")} value={settings.maxOutputTokens} min={256} max={16384} step={256} onChange={(v) => save({ maxOutputTokens: v })} />
        </Field>
        <Field label={t("settings.safety")} hint={t("settings.safetyHint")}>
          <SegmentedControl<SafetyLevel>
            value={settings.safetyLevel}
            onChange={(v) => save({ safetyLevel: v })}
            aria-label={t("settings.safety")}
            options={SAFETY_LEVELS.map((level) => ({ value: level, label: t(`settings.safety_${level}`) }))}
          />
        </Field>
        <Switch checked={settings.followUps} onChange={(v) => save({ followUps: v })} label={t("settings.followUps")} />
        <Switch checked={settings.webSearch} onChange={(v) => save({ webSearch: v })} label={t("settings.webSearch")} />
        <Switch checked={settings.tools} onChange={(v) => save({ tools: v })} label={t("settings.tools")} />
        <Switch checked={settings.useDocuments} onChange={(v) => save({ useDocuments: v })} label={t("settings.useDocuments")} />
      </Section>

      <Section title={t("settings.quotaTitle")}>
        <QuotaBar quota={user.quota} />
      </Section>

      <Section title={t("settings.shortcuts")}>
        <ul className="divide-y divide-border">
          {SHORTCUTS.map((s) => (
            <li key={s.labelKey} className="flex items-center justify-between py-2 text-sm">
              <span>{t(s.labelKey)}</span>
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
