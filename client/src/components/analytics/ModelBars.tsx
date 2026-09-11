import { formatNumber } from "@/lib/utils";

/** Horizontal bars showing how many answers each model produced. */
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
