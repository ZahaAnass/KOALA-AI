import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUi } from "@/store/ui";

let renderCounter = 0;

/** Renders a mermaid diagram lazily (the library is code-split and loaded on first use). */
export function MermaidBlock({ code }: { code: string }) {
  const id = useId().replace(/:/g, "");
  const { t } = useTranslation();
  const theme = useUi((s) => s.theme);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const isDark = document.documentElement.classList.contains("dark");
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: isDark ? "dark" : "default", securityLevel: "strict", fontFamily: "Inter, sans-serif" });
        const { svg } = await mermaid.render(`mermaid-${id}-${renderCounter++}`, code);
        if (!cancelled) {
          setSvg(svg);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t("message.diagramError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, id, theme, t]);

  if (error) {
    return (
      <pre className="my-3 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-500">
        {error}
        {"\n\n"}
        {code}
      </pre>
    );
  }
  if (!svg) return <div className="skeleton my-3 h-32 w-full" />;
  return <div className="my-3 flex justify-center overflow-x-auto rounded-xl border border-border bg-bg-elevated p-3 [&>svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
