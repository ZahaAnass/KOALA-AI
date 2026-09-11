import { Code2, FileText, ImageIcon, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useChatStream } from "@/hooks/useChatStream";
import { useUser } from "@/hooks/useUser";
import { useChatStore } from "@/store/chat";
import { useUi } from "@/store/ui";
import { Header } from "@/components/layout/Header";
import { Composer } from "@/components/chat/Composer";
import { Message } from "@/components/chat/Message";

/** New-chat screen: greeting, quick actions, suggestions and the composer. */
export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: user } = useUser();
  const { send, stop, streaming } = useChatStream();
  const active = useChatStore((s) => s.active);
  const insert = useUi((s) => s.insertIntoComposer);
  const setOptions = useChatStore((s) => s.setOptions);

  const firstName = user?.name?.split(" ")[0];
  const suggestions = t("dashboard.suggestions", { returnObjects: true }) as string[];
  const cards = [
    { key: "chat", icon: <MessageSquare />, tone: "text-brand-500 bg-brand-500/10", onClick: () => insert("") },
    { key: "image", icon: <ImageIcon />, tone: "text-accent-500 bg-accent-500/10", onClick: () => insert("Describe what you see in this image: ") },
    { key: "code", icon: <Code2 />, tone: "text-emerald-500 bg-emerald-500/10", onClick: () => insert("Help me with this code:\n\n```\n\n```") },
    { key: "docs", icon: <FileText />, tone: "text-amber-500 bg-amber-500/10", onClick: () => navigate("/documents") },
  ] as const;

  // A chat being created from this screen shows its first exchange here until the route changes.
  const pendingExchange = active && active.chatId === null ? active : null;

  return (
    <>
      <Header />
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8">
            {pendingExchange ? (
              <div className="flex flex-col gap-6">
                {pendingExchange.userMessage && <Message message={pendingExchange.userMessage} />}
                <Message message={{ _id: "streaming", role: "model", text: pendingExchange.text, images: [], sources: pendingExchange.sources, toolCalls: pendingExchange.toolCalls, model: pendingExchange.model, feedback: null, usage: { promptTokens: 0, candidateTokens: 0, totalTokens: 0 }, edited: false, createdAt: new Date().toISOString(), error: pendingExchange.error ?? undefined }} streaming={streaming} />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-8 pt-6 text-center sm:pt-14 animate-slide-up">
                <img src="/bot.png" alt="" className="size-24 animate-float sm:size-28" />
                <div>
                  <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                    <span className="gradient-text">{t("dashboard.greeting", { name: firstName ? ` ${firstName}` : "" })}</span>
                  </h1>
                  <p className="mt-2 text-fg-muted">{t("dashboard.subtitle")}</p>
                </div>

                <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
                  {cards.map((card) => (
                    <button
                      key={card.key}
                      type="button"
                      onClick={card.onClick}
                      className="surface group flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5 hover:border-brand-500/50"
                    >
                      <span className={`inline-flex size-9 items-center justify-center rounded-xl [&>svg]:size-4 ${card.tone}`}>{card.icon}</span>
                      <span className="text-sm font-medium">{t(`dashboard.cards.${card.key}.title`)}</span>
                      <span className="text-xs text-fg-muted">{t(`dashboard.cards.${card.key}.text`)}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        if (/weather|temps/i.test(s)) setOptions({ tools: true, webSearch: false });
                        void send({ text: s });
                      }}
                      className="rounded-full border border-border px-3.5 py-1.5 text-xs text-fg-muted transition-colors hover:border-brand-500 hover:text-fg"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 pb-4 sm:pb-6">
          <Composer autoFocus streaming={streaming} onStop={stop} onSend={(text, images) => send({ text, images })} />
        </div>
      </main>
    </>
  );
}
