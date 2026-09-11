import { useState } from "react";
import { ChevronDown, ExternalLink, FileText, Sparkles, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Source, ToolCall } from "@/types/api";

export function Sources({ sources }: { sources: Source[] }) {
  const { t } = useTranslation();
  if (sources.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{t("message.sources")}</span>
      {sources.map((s, i) => {
        const isDoc = s.uri.startsWith("document:");
        const host = isDoc ? t("message.document") : safeHost(s.uri);
        const inner = (
          <>
            {isDoc ? <FileText className="size-3" /> : <ExternalLink className="size-3" />}
            <span className="max-w-40 truncate">{s.title || host}</span>
            <span className="text-fg-subtle">{host}</span>
          </>
        );
        const cls = "inline-flex items-center gap-1 rounded-full border border-border bg-bg-muted px-2 py-0.5 text-[11px] text-fg-muted transition-colors hover:border-brand-500 hover:text-fg";
        return isDoc ? (
          <span key={i} className={cls}>
            {inner}
          </span>
        ) : (
          <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className={cls}>
            {inner}
          </a>
        );
      })}
    </div>
  );
}

function safeHost(uri: string): string {
  try {
    return new URL(uri).hostname.replace(/^www\./, "");
  } catch {
    return uri;
  }
}

export function ToolCallCard({ call }: { call: ToolCall }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border bg-bg-muted/60 text-xs">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-fg-muted hover:bg-bg-hover">
        <Wrench className="size-3.5 text-brand-500" />
        <span className="font-medium text-fg">{t("message.toolUsed")}:</span>
        <code className="font-mono">{call.name}</code>
        <ChevronDown className={cn("ml-auto size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <pre className="max-h-60 overflow-auto border-t border-border bg-code-bg p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify({ args: call.args, result: call.result }, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function FollowUps({ items, onPick, disabled }: { items: string[]; onPick: (text: string) => void; disabled?: boolean }) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <div className="mt-2 animate-fade-in">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
        <Sparkles className="size-3" /> {t("message.followUps")}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onPick(q)}
            className="rounded-full border border-border bg-bg-elevated px-3 py-1.5 text-left text-xs text-fg-muted transition-colors hover:border-brand-500 hover:text-fg disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 rounded-full bg-fg-muted animate-pulse-soft" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </span>
  );
}
