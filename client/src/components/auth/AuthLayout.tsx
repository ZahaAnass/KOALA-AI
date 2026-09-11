import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Shared full-screen layout for the Clerk sign-in / sign-up widgets. */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-4 py-10">
      <img src="/orbital.png" alt="" aria-hidden className="pointer-events-none absolute -left-1/4 -top-1/4 w-[80vw] max-w-4xl animate-spin-slow opacity-10" />
      <Link to="/" className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-fg-muted hover:bg-bg-hover hover:text-fg">
        <ArrowLeft className="size-4" />
        {t("nav.home")}
      </Link>
      <Link to="/" className="mb-6 flex items-center gap-2 font-display text-lg font-semibold">
        <img src="/logo.png" alt="" className="size-9" />
        KOALA AI
      </Link>
      <div className="relative animate-slide-up">{children}</div>
    </div>
  );
}
