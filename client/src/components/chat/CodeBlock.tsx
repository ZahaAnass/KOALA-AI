import type { ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCopy } from "@/hooks/useCopy";
import { MermaidBlock } from "./MermaidBlock";

interface CodeBlockProps {
  language: string;
  code: string;
  children: ReactNode;
}

/** Fenced code block with a language label and copy button. Mermaid fences render as diagrams. */
export function CodeBlock({ language, code, children }: CodeBlockProps) {
  const { t } = useTranslation();
  const { copied, copy } = useCopy();

  if (language === "mermaid") return <MermaidBlock code={code} />;

  return (
    <div className="group/code my-3 overflow-hidden rounded-xl border border-border bg-code-bg">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-[11px] text-fg-muted">
        <span className="font-mono uppercase tracking-wide">{language || "text"}</span>
        <button type="button" onClick={() => void copy(code)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-bg-hover hover:text-fg" aria-label={t("message.copyCode")}>
          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          {copied ? t("message.copied") : t("message.copyCode")}
        </button>
      </div>
      {children}
    </div>
  );
}
