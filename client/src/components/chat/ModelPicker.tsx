import { Check, ChevronDown, Cpu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useModels } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/Menu";

interface ModelPickerProps {
  value: string | undefined;
  onChange: (model: string) => void;
  compact?: boolean;
}

/** Dropdown listing the models the server exposes, grouped by provider. */
export function ModelPicker({ value, onChange, compact }: ModelPickerProps) {
  const { t } = useTranslation();
  const { data } = useModels();
  const models = data?.models ?? [];
  const current = models.find((m) => m.id === (value || data?.defaultModel));
  const providers = Array.from(new Set(models.map((m) => m.provider)));

  return (
    <Menu>
      <MenuTrigger>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg",
            compact && "px-1.5",
          )}
          title={t("composer.model")}
        >
          <Cpu className="size-3.5 text-brand-500" />
          {!compact && <span className="max-w-32 truncate">{current?.label ?? t("composer.model")}</span>}
          <ChevronDown className="size-3.5" />
        </button>
      </MenuTrigger>
      <MenuContent align="start" className="w-72">
        {providers.map((provider) => (
          <div key={provider}>
            <MenuLabel>{provider === "gemini" ? "Google Gemini" : "OpenAI"}</MenuLabel>
            {models
              .filter((m) => m.provider === provider)
              .map((m) => (
                <MenuItem key={m.id} onSelect={() => onChange(m.id)} icon={current?.id === m.id ? <Check className="text-brand-500" /> : <span className="size-4" />}>
                  <span className="block truncate font-medium">{m.label}</span>
                  <span className="block truncate text-[11px] text-fg-subtle">{m.description}</span>
                </MenuItem>
              ))}
          </div>
        ))}
      </MenuContent>
    </Menu>
  );
}
