import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useChat, useLoadEarlier, useMessageFeedback } from "@/hooks/useChats";
import { useChatStream } from "@/hooks/useChatStream";
import { useSpeechOutput } from "@/hooks/useSpeech";
import { useChatStore } from "@/store/chat";
import type { Message as MessageType } from "@/types/api";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { Header } from "@/components/layout/Header";
import { ChatMenu } from "@/components/chat/ChatMenu";
import { Composer } from "@/components/chat/Composer";
import { Message } from "@/components/chat/Message";
import { FollowUps } from "@/components/chat/MessageExtras";

const emptyUsage = { promptTokens: 0, candidateTokens: 0, totalTokens: 0 };

/** Conversation view: message history, live streaming answer, follow-ups and the composer. */
export default function ChatPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: chat, isPending, error } = useChat(id);
  const loadEarlier = useLoadEarlier(id);
  const feedback = useMessageFeedback(id);
  const { send, regenerate, edit, stop, streaming } = useChatStream();
  const speech = useSpeechOutput(i18n.language === "fr" ? "fr-FR" : "en-US");

  const active = useChatStore((s) => s.active);
  const followUps = useChatStore((s) => s.followUps[id] ?? []);
  const clearActive = useChatStore((s) => s.clear);
  const isActiveHere = active?.chatId === id;

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  // Track whether the user is near the bottom so we only auto-scroll when they are.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => endRef.current?.scrollIntoView({ behavior, block: "end" }), []);

  useEffect(() => {
    if (atBottom) scrollToBottom(active?.text ? "auto" : "smooth");
  }, [active?.text, chat?.messages.length, atBottom, scrollToBottom]);

  useEffect(() => {
    scrollToBottom("auto");
  }, [id, scrollToBottom]);

  // Dismiss a failed generation error when leaving the chat.
  useEffect(() => () => {
    if (useChatStore.getState().active?.error) clearActive();
  }, [id, clearActive]);

  /** Visible messages: cached history, trimmed during regenerate/edit, plus the live exchange. */
  const messages = useMemo<MessageType[]>(() => {
    if (!chat) return [];
    let list = chat.messages;
    if (isActiveHere && active) {
      if (active.answeringMessageId) {
        const idx = list.findIndex((m) => m._id === active.answeringMessageId);
        if (idx >= 0) list = list.slice(0, idx + 1);
        if (active.userMessage) list = list.map((m) => (m._id === active.answeringMessageId ? { ...m, text: active.userMessage!.text, edited: true } : m));
      } else if (active.userMessage) {
        list = [...list, active.userMessage];
      }
      list = [
        ...list,
        {
          _id: "streaming",
          role: "model",
          text: active.text,
          images: [],
          sources: active.sources,
          toolCalls: active.toolCalls,
          model: active.model,
          feedback: null,
          usage: emptyUsage,
          edited: false,
          createdAt: new Date().toISOString(),
          streaming: !active.error,
          error: active.error ?? undefined,
        },
      ];
    }
    return list;
  }, [chat, active, isActiveHere]);

  const title = chat?.title ?? "";
  useEffect(() => {
    document.title = title ? `${title} · KOALA AI` : "KOALA AI";
    return () => {
      document.title = "KOALA AI";
    };
  }, [title]);

  if (error) {
    return (
      <>
        <Header />
        <main className="flex flex-1 items-center justify-center p-6">
          <EmptyState title={t("chat.notFound")} action={<Button onClick={() => navigate("/dashboard")}>{t("nav.newChat")}</Button>} />
        </main>
      </>
    );
  }

  return (
    <>
      <Header title={title} actions={chat ? <ChatMenu chat={chat} isCurrent /> : undefined} />
      <main className="relative flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
            {isPending ? (
              <div className="flex flex-col gap-6">
                <Skeleton className="ml-auto h-10 w-2/3 rounded-3xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="ml-auto h-10 w-1/2 rounded-3xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </div>
            ) : (
              <>
                {chat?.page.hasMore && (
                  <div className="flex justify-center">
                    <Button size="sm" variant="outline" loading={loadEarlier.isPending} onClick={() => loadEarlier.mutate()} leftIcon={<ChevronUp className="size-4" />}>
                      {t("chat.loadEarlier")}
                    </Button>
                  </div>
                )}
                {messages.map((m) => (
                  <Message
                    key={m._id}
                    message={m}
                    streaming={m.streaming}
                    disabled={streaming}
                    onRegenerate={(mid) => void regenerate(id, mid)}
                    onEdit={(mid, text) => void edit(id, mid, text)}
                    onFeedback={(mid, value) => feedback.mutate({ messageId: mid, feedback: value })}
                    onSpeak={speech.supported ? speech.speak : undefined}
                    speakingId={speech.speakingId}
                  />
                ))}
                {!streaming && followUps.length > 0 && <FollowUps items={followUps} onPick={(q) => void send({ chatId: id, text: q })} />}
              </>
            )}
            <div ref={endRef} className="h-px" />
          </div>
        </div>

        {!atBottom && (
          <IconButton label={t("chat.scrollToBottom")} variant="secondary" onClick={() => scrollToBottom()} className="absolute bottom-40 left-1/2 z-10 -translate-x-1/2 rounded-full shadow-lg animate-fade-in">
            <ArrowDown />
          </IconButton>
        )}

        <div className="mx-auto w-full max-w-3xl px-4 pb-4 sm:pb-6">
          <Composer chatId={id} streaming={streaming} onStop={stop} onSend={(text, images) => send({ chatId: id, text, images })} />
        </div>
      </main>
    </>
  );
}
