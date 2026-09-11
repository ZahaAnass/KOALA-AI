import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, Link2Off, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { copyToClipboard } from "@/lib/utils";
import { useUpdateChat } from "@/hooks/useChats";
import { useModels } from "@/hooks/useUser";
import type { ChatSummary } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { Spinner } from "@/components/ui/Feedback";

interface ChatDialogProps {
  chat: ChatSummary & { systemInstruction?: string };
  open: boolean;
  onClose: () => void;
}

export function ShareDialog({ chat, open, onClose }: ChatDialogProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const shareUrl = chat.shareToken ? `${window.location.origin}/share/${chat.shareToken}` : "";

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["chats"], exact: false });
    void qc.invalidateQueries({ queryKey: queryKeys.chat(chat._id) });
  };
  const share = useMutation({ mutationFn: () => api.chats.share(chat._id), onSuccess: invalidate });
  const unshare = useMutation({ mutationFn: () => api.chats.unshare(chat._id), onSuccess: invalidate });

  const copy = async () => {
    if (await copyToClipboard(shareUrl)) {
      setCopied(true);
      toast.success(t("chat.shareCopied"));
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("chat.shareTitle")} description={t("chat.shareHint")} size="sm">
      {shareUrl ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input readOnly value={shareUrl} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button variant="secondary" onClick={copy} leftIcon={copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}>
              {copied ? t("message.copied") : t("message.copy")}
            </Button>
          </div>
          <Button variant="danger" loading={unshare.isPending} onClick={() => unshare.mutate()} leftIcon={<Link2Off className="size-4" />}>
            {t("chat.shareRevoke")}
          </Button>
        </div>
      ) : (
        <Button loading={share.isPending} onClick={() => share.mutate()} leftIcon={<Link2 className="size-4" />} className="w-full">
          {t("chat.shareCreate")}
        </Button>
      )}
    </Dialog>
  );
}

/** Per-chat model and custom instructions. */
export function ChatSettingsDialog({ chat, open, onClose }: ChatDialogProps) {
  const { t } = useTranslation();
  const { data: models } = useModels();
  const update = useUpdateChat();
  const [model, setModel] = useState(chat.model);
  const [instruction, setInstruction] = useState(chat.systemInstruction ?? "");

  useEffect(() => {
    if (open) {
      setModel(chat.model);
      setInstruction(chat.systemInstruction ?? "");
    }
  }, [open, chat.model, chat.systemInstruction]);

  const save = async () => {
    await update.mutateAsync({ id: chat._id, patch: { model, systemInstruction: instruction } });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("chat.chatSettings")}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={save} loading={update.isPending}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={t("chat.modelForChat")} htmlFor="chat-model">
          <Select id="chat-model" value={model} onChange={(e) => setModel(e.target.value)}>
            {(models?.models ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("chat.instructions")} htmlFor="chat-instructions">
          <Textarea id="chat-instructions" value={instruction} onChange={(e) => setInstruction(e.target.value)} maxLength={4000} placeholder={t("settings.systemInstructionHint")} />
        </Field>
      </div>
    </Dialog>
  );
}

/** Edit the tag list of a chat. */
export function TagsDialog({ chat, open, onClose }: ChatDialogProps) {
  const { t } = useTranslation();
  const update = useUpdateChat();
  const [tags, setTags] = useState<string[]>(chat.tags);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (open) setTags(chat.tags);
  }, [open, chat.tags]);

  const add = () => {
    const tag = draft.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 20) setTags([...tags, tag]);
    setDraft("");
  };

  const save = async () => {
    await update.mutateAsync({ id: chat._id, patch: { tags } });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("chat.tags")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={save} loading={update.isPending}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-medium text-brand-500">
            #{tag}
            <button type="button" aria-label={`${t("common.delete")} ${tag}`} onClick={() => setTags(tags.filter((x) => x !== tag))} className="rounded-full hover:bg-brand-500/20">
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === ",") && (e.preventDefault(), add())}
        placeholder={t("chat.addTag")}
        className="mt-3"
        maxLength={40}
      />
    </Dialog>
  );
}

/** Generates an image and appends it to the current chat. */
export function ImageGenDialog({ open, onClose, chatId }: { open: boolean; onClose: () => void; chatId?: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<{ url: string } | null>(null);

  const generate = useMutation({
    mutationFn: () => api.images.generate(prompt.trim(), chatId),
    onSuccess: (data) => {
      setResult(data);
      if (chatId) void qc.invalidateQueries({ queryKey: queryKeys.chat(chatId) });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("common.error")),
  });

  useEffect(() => {
    if (!open) {
      setPrompt("");
      setResult(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} title={t("composer.generateImage")} size="md">
      <div className="flex flex-col gap-3">
        <Textarea autoFocus value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A watercolor koala coding on a laptop, soft morning light" maxLength={2000} />
        <Button onClick={() => generate.mutate()} disabled={!prompt.trim()} loading={generate.isPending} leftIcon={<Sparkles className="size-4" />}>
          {t("composer.generateImage")}
        </Button>
        {generate.isPending && (
          <div className="flex h-64 items-center justify-center rounded-2xl bg-bg-muted">
            <Spinner className="size-8 text-brand-500" />
          </div>
        )}
        {result && <img src={result.url} alt={prompt} className="w-full rounded-2xl border border-border" />}
      </div>
    </Dialog>
  );
}

/** Fetches a web page's text and hands a summarization prompt back to the composer. */
export function UrlDialog({ open, onClose, onResult }: { open: boolean; onClose: () => void; onResult: (prompt: string) => void }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const fetchUrl = useMutation({
    mutationFn: () => api.tools.url(url.trim()),
    onSuccess: (page) => {
      onResult(`Summarize the following web page in a few bullet points, then list the key takeaways.\n\nTitle: ${page.title}\nURL: ${page.url}\n\n${page.text}`);
      setUrl("");
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("common.error")),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("composer.summarizeUrl")}
      size="sm"
      footer={
        <Button onClick={() => fetchUrl.mutate()} disabled={!/^https?:\/\//.test(url.trim())} loading={fetchUrl.isPending} className="w-full">
          {t("composer.summarizeUrl")}
        </Button>
      }
    >
      <Input autoFocus type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/article" onKeyDown={(e) => e.key === "Enter" && fetchUrl.mutate()} />
    </Dialog>
  );
}

/** Quick picker listing prompt templates to insert into the composer. */
export function PromptPickerDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (content: string) => void }) {
  const { t } = useTranslation();
  const { data, isPending } = useQuery({ queryKey: queryKeys.prompts, queryFn: api.prompts.list, enabled: open });
  const all = [...(data?.items ?? []), ...(data?.builtin ?? [])];

  return (
    <Dialog open={open} onClose={onClose} title={t("composer.templates")} size="md">
      {isPending ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {all.map((p) => (
            <button
              key={p._id}
              type="button"
              onClick={() => {
                onPick(p.content);
                onClose();
              }}
              className="flex flex-col gap-1 rounded-xl border border-border p-3 text-left transition-colors hover:border-brand-500 hover:bg-bg-hover"
            >
              <span className="text-sm font-medium">
                <span className="mr-1.5">{p.icon}</span>
                {p.title}
              </span>
              <span className="line-clamp-2 text-xs text-fg-muted">{p.content}</span>
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}
