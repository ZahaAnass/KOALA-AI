import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Card with a heading, used to group page content. */
export function Section({ title, children, actions, className }: { title: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn("surface rounded-2xl p-5", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {actions}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
