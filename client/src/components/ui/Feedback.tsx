import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin size-5 text-current", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton h-4 w-full", className)} aria-hidden {...props} />;
}

type BadgeTone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger";
const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-bg-muted text-fg-muted",
  brand: "bg-brand-500/15 text-brand-500",
  accent: "bg-accent-500/15 text-accent-500",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  danger: "bg-red-500/15 text-red-600 dark:text-red-400",
};

export function Badge({ tone = "neutral", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-4", badgeTones[tone], className)}>{children}</span>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-bg-muted px-1.5 font-mono text-[10px] text-fg-muted">
      {children}
    </kbd>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-strong p-10 text-center", className)}>
      {icon && <div className="text-fg-subtle [&>svg]:size-10">{icon}</div>}
      <p className="font-display text-base font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-fg-muted">{description}</p>}
      {action}
    </div>
  );
}

/** Lightweight CSS-only tooltip. Wrap any focusable element. */
export function Tooltip({ label, children, side = "top", className }: { label: string; children: ReactNode; side?: "top" | "bottom"; className?: string }) {
  return (
    <span className={cn("group/tip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-fg px-2 py-1 text-[11px] font-medium text-bg opacity-0 transition-opacity",
          "group-hover/tip:opacity-100 group-focus-within/tip:opacity-100",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
        )}
      >
        {label}
      </span>
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon }: { label: string; value: string | number; hint?: string; icon?: ReactNode }) {
  return (
    <div className="surface rounded-2xl p-4">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-fg-subtle">
        {label}
        {icon && <span className="text-fg-subtle [&>svg]:size-4">{icon}</span>}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-fg-muted">{hint}</div>}
    </div>
  );
}
