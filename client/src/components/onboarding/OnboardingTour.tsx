import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { cn, modKey } from "@/lib/utils";

interface Step {
  title: string;
  text: string;
}

const STEP_ART = ["🐨", "🖼️", "🔎", "🎨"] as const;

/** Four-step welcome tour. The parent decides when it opens and persists completion. */
export function OnboardingTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const steps = t("onboarding.steps", { returnObjects: true, mod: modKey }) as Step[];
  const step = steps[index];
  const isLast = index === steps.length - 1;

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  if (!step) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("onboarding.skip")}
          </Button>
          <Button onClick={() => (isLast ? onClose() : setIndex(index + 1))}>{isLast ? t("onboarding.done") : t("onboarding.next")}</Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500/15 to-accent-500/15">
          {index === 0 ? <img src="/bot.png" alt="" className="size-20 animate-float object-contain" /> : <span className="text-5xl">{STEP_ART[index] ?? "✨"}</span>}
        </div>
        <h2 className="font-display text-xl font-semibold">{step.title}</h2>
        <p className="text-sm text-fg-muted">{step.text}</p>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {steps.map((_, i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-brand-500" : "w-1.5 bg-border-strong")} />
          ))}
        </div>
      </div>
    </Dialog>
  );
}
