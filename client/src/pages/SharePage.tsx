import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ExternalLink, Ghost } from "lucide-react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { cn, formatRelative } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { MarkdownContent } from "@/components/chat/Markdown";
import type { SharedChat } from "@/types/api";

function SharedMessage({ message }: { message: SharedChat["messages"][number] }) {
  const { t } = useTranslation();
  const isUser = message.role === "user";
  return (
    <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{isUser ? t("message.you") : t("message.assistant")}</span>
      {message.images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {message.images.map((img) => (
            <img key={img.filePath} src={img.url} alt={t("message.attachedImage")} className="max-h-72 rounded-2xl border border-border object-cover" loading="lazy" />
          ))}
        </div>
      )}
      {message.text && (
        <div className={cn("max-w-full rounded-3xl px-4 py-3", isUser ? "bg-user-bubble" : "surface")}>
          <MarkdownContent text={message.text} />
        </div>
      )}
      {message.sources.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {message.sources.map((s) => (
            <li key={s.uri}>
              <a href={s.uri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-bg-muted px-2.5 py-1 text-xs text-fg-muted hover:text-fg">
                <ExternalLink className="size-3" />
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SharePage() {
  const { t, i18n } = useTranslation();
  const { token = "" } = useParams();
  const { data, isPending, isError } = useQuery({ queryKey: queryKeys.shared(token), queryFn: () => api.share.get(token), enabled: token.length > 0 });

  return (
    <div className="min-h-screen bg-bg">
      <header className="glass sticky top-0 z-20">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-display font-semibold">
            <img src="/logo.png" alt="" className="size-8" />
            KOALA AI
          </Link>
          <Link to="/dashboard">
            <Button size="sm">{t("share.cta")}</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        {isPending && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
          </div>
        )}
        {isError && <EmptyState icon={<Ghost />} title={t("share.notFound")} />}
        {data && (
          <>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{data.title}</h1>
            <p className="mt-1 text-sm text-fg-muted">
              {t("share.readOnly")} · {formatRelative(data.sharedAt ?? data.createdAt, i18n.language)}
            </p>
            <div className="mt-8 flex flex-col gap-6">
              {data.messages.map((m) => (
                <SharedMessage key={m._id} message={m} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
