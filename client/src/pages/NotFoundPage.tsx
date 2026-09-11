import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-6 text-center">
      <img src="/bot.png" alt="" className="w-40 animate-float opacity-90" />
      <p className="font-display text-7xl font-semibold gradient-text">404</p>
      <div>
        <h1 className="font-display text-2xl font-semibold">{t("common.notFound")}</h1>
        <p className="mt-2 text-fg-muted">{t("common.notFoundHint")}</p>
      </div>
      <Link to="/">
        <Button leftIcon={<Home className="size-4" />}>{t("common.goHome")}</Button>
      </Link>
    </div>
  );
}
