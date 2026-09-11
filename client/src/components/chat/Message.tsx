import { memo, useState } from "react";
import { Check, Copy, Pencil, RefreshCw, Square, ThumbsDown, ThumbsUp, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCopy } from "@/hooks/useCopy";
import { cn, formatNumber } from "@/lib/utils";
import type { Message as MessageType } from "@/types/api";
import { IconButton, Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Form";
import { MarkdownContent } from "./Markdown";
import { Sources, ToolCallCard, TypingIndicator } from "./MessageExtras";

export interface MessageActions {
  onRegenerate?: (messageId: string) => void;
  onEdit?: (messageId: string, text: string) => void;
  onFeedback?: (messageId: string, feedback: "up" | "down" | null) => void;
  onSpeak?: (messageId: string, text: string) => void;
  speakingId?: string | null;
}

interface MessageProps extends MessageActions {
  message: MessageType;
  streaming?: boolean;
  disabled?: boolean;
}

/** One chat turn. User turns render as a bubble; assistant turns render full-width Markdown. */
export const Message = memo(function Message({ message, streaming, disabled, onRegenerate, onEdit, onFeedback, onSpeak, speakingId }: MessageProps) {
  const { t } = useTranslation();
  const isUser = message.role === "user";
  const [editing, setEditing] = useState(false);
  const canEdit = isUser && Boolean(onEdit) && !message._id.startsWith("local-");

  const submitEdit = (text: string) => {
    setEditing(false);
    if (text && text !== message.text) onEdit?.(message._id, text);
  };

  return (
    <div className={cn("group/msg flex w-full flex-col gap-1.5 animate-fade-in", isUser ? "items-end" : "items-start")} data-role={message.role}>
      <Attachments message={message} />

      {isUser && editing && <EditBox initial={message.text} onCancel={() => setEditing(false)} onSubmit={submitEdit} />}
      {isUser && !editing && <UserBubble message={message} />}
      {!isUser && <AssistantBody message={message} streaming={streaming} />}

      {!streaming && !editing && (
        <div className={cn("flex items-center gap-0.5 text-fg-subtle opacity-0 transition-opacity group-hover/msg:opacity-100 focus-within:opacity-100", isUser ? "mr-1" : "ml-10")}>
          {message.text && <CopyButton text={message.text} />}
          {canEdit && (
            <IconButton size="sm" label={t("message.edit")} disabled={disabled} onClick={() => setEditing(true)}>
              <Pencil />
            </IconButton>
          )}
          {!isUser && onRegenerate && (
            <IconButton size="sm" label={t("message.regenerate")} disabled={disabled} onClick={() => onRegenerate(message._id)}>
              <RefreshCw />
            </IconButton>
          )}
          {!isUser && onSpeak && message.text && (
            <IconButton size="sm" label={speakingId === message._id ? t("message.stopSpeaking") : t("message.speak")} active={speakingId === message._id} onClick={() => onSpeak(message._id, message.text)}>
              {speakingId === message._id ? <Square /> : <Volume2 />}
            </IconButton>
          )}
          {!isUser && onFeedback && <FeedbackButtons message={message} onFeedback={onFeedback} />}
          {!isUser && message.usage.totalTokens > 0 && (
            <span className="ml-2 text-[11px]">
              {message.model && <span className="mr-2 font-mono">{message.model}</span>}
              {t("message.tokens", { count: message.usage.totalTokens, formattedCount: formatNumber(message.usage.totalTokens) })}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

function Attachments({ message }: { message: MessageType }) {
  const { t } = useTranslation();
  if (message.images.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", message.role === "user" ? "justify-end" : "justify-start")}>
      {message.images.map((img) => (
        <a key={img.filePath} href={img.url} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-2xl border border-border">
          <img src={img.url} alt={t("message.attachedImage")} loading="lazy" className="max-h-72 max-w-xs object-cover" />
        </a>
      ))}
    </div>
  );
}

function UserBubble({ message }: { message: MessageType }) {
  const { t } = useTranslation();
  if (!message.text) return null;
  return (
    <div className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-user-bubble px-4 py-2.5 text-[15px] leading-relaxed">
      {message.text}
      {message.edited && <span className="ml-2 text-[10px] uppercase tracking-wide text-fg-subtle">{t("message.edited")}</span>}
    </div>
  );
}

function EditBox({ initial, onCancel, onSubmit }: { initial: string; onCancel: () => void; onSubmit: (text: string) => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initial);
  const submit = () => onSubmit(draft.trim());
  return (
    <div className="w-full max-w-[85%] rounded-2xl border border-brand-500 bg-bg-elevated p-2">
      <Textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="min-h-20 border-0 bg-transparent focus:border-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="flex justify-end gap-2 px-1 pb-1">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t("message.cancel")}
        </Button>
        <Button size="sm" onClick={submit}>
          {t("message.saveEdit")}
        </Button>
      </div>
    </div>
  );
}

function AssistantBody({ message, streaming }: { message: MessageType; streaming?: boolean }) {
  const showTyping = !message.text && streaming;
  return (
    <div className="flex w-full gap-3">
      <img src="/logo.png" alt="" className="mt-1 size-7 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        {message.toolCalls.map((call, i) => (
          <ToolCallCard key={`${call.name}-${i}`} call={call} />
        ))}
        {message.text && <MarkdownContent text={message.text} />}
        {showTyping && <TypingIndicator />}
        {streaming && message.text && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse-soft rounded-sm bg-brand-500 align-text-bottom" />}
        {message.error && <p className="mt-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-500">{message.error}</p>}
        <Sources sources={message.sources} />
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const { copied, copy } = useCopy();
  return (
    <IconButton size="sm" label={copied ? t("message.copied") : t("message.copy")} onClick={() => void copy(text)}>
      {copied ? <Check className="text-emerald-500" /> : <Copy />}
    </IconButton>
  );
}

function FeedbackButtons({ message, onFeedback }: { message: MessageType; onFeedback: NonNullable<MessageActions["onFeedback"]> }) {
  const { t } = useTranslation();
  const toggle = (value: "up" | "down") => onFeedback(message._id, message.feedback === value ? null : value);
  return (
    <>
      <IconButton size="sm" label={t("message.good")} active={message.feedback === "up"} onClick={() => toggle("up")}>
        <ThumbsUp />
      </IconButton>
      <IconButton size="sm" label={t("message.bad")} active={message.feedback === "down"} onClick={() => toggle("down")}>
        <ThumbsDown />
      </IconButton>
    </>
  );
}
