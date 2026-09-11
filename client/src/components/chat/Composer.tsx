import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import { ArrowUp, BookText, FileSearch, Globe, ImagePlus, Link, Mic, MicOff, Sparkles, Square, Wrench, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { speechLang } from "@/i18n";
import { uploadImage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSpeechInput } from "@/hooks/useSpeech";
import { useModels, useUser } from "@/hooks/useUser";
import { useChatStore } from "@/store/chat";
import { useUi } from "@/store/ui";
import type { ImageRef } from "@/types/api";
import { IconButton } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Feedback";
import { ModelPicker } from "./ModelPicker";
import { ImageGenDialog, PromptPickerDialog, UrlDialog } from "./ChatDialogs";

export interface Attachment {
  id: string;
  file: File;
  preview: string;
  progress: number;
  uploaded?: ImageRef;
  error?: string;
}

interface ComposerProps {
  chatId?: string;
  onSend: (text: string, images: ImageRef[]) => Promise<void>;
  onStop: () => void;
  streaming: boolean;
  autoFocus?: boolean;
}

const MAX_ATTACHMENTS = 4;

/** Message input with attachments, voice, per-message toggles, model picker and quick tools. */
export function Composer({ chatId, onSend, onStop, streaming, autoFocus }: ComposerProps) {
  const { t } = useTranslation();
  const { data: user } = useUser();
  const { data: modelsInfo } = useModels();
  const options = useChatStore((s) => s.options);
  const setOptions = useChatStore((s) => s.setOptions);
  const composerInsert = useUi((s) => s.composerInsert);
  const consumeInsert = useUi((s) => s.consumeComposerInsert);

  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [dialog, setDialog] = useState<"templates" | "image" | "url" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const features = modelsInfo?.features;
  const quota = user?.quota;
  const quotaReached = quota?.remaining === 0;
  const uploading = attachments.some((a) => !a.uploaded && !a.error);
  const canSend = !streaming && !uploading && !quotaReached && (text.trim().length > 0 || attachments.some((a) => a.uploaded));

  // Pull queued text (templates, follow-ups, URL summaries) into the textarea. An empty insert only focuses.
  useEffect(() => {
    if (composerInsert === null) return;
    const inserted = consumeInsert();
    if (inserted) setText((prev) => (prev ? `${prev}\n${inserted}` : inserted));
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [composerInsert, consumeInsert]);

  // Release object URLs of previews that were never sent.
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  useEffect(() => () => attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.preview)), []);

  // Auto-grow the textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [text]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  // "/" focuses the composer from anywhere.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editable = target && (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName));
      if (e.key === "/" && !editable) {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const speech = useSpeechInput(speechLang(), (transcript, final) => {
    if (final) setText((prev) => `${prev.trimEnd()} ${transcript}`.trim());
  });

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      if (!features?.imageUploads) {
        toast.error(t("composer.uploadsDisabled"));
        return;
      }
      const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) return;
      const room = MAX_ATTACHMENTS - attachments.length;
      for (const file of images.slice(0, Math.max(0, room))) {
        const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const preview = URL.createObjectURL(file);
        setAttachments((prev) => [...prev, { id, file, preview, progress: 0 }]);
        uploadImage(file, (progress) => setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, progress } : a))))
          .then((uploaded) => setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, uploaded, progress: 100 } : a))))
          .catch((err: Error) => {
            toast.error(err.message);
            setAttachments((prev) => prev.filter((a) => a.id !== id));
          });
      }
    },
    [attachments.length, features?.imageUploads, t],
  );

  const removeAttachment = (id: string) =>
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((a) => a.id !== id);
    });

  const submit = async () => {
    if (!canSend) return;
    const images = attachments.flatMap((a) => (a.uploaded ? [a.uploaded] : []));
    const value = text.trim();
    setText("");
    attachments.forEach((a) => URL.revokeObjectURL(a.preview));
    setAttachments([]);
    speech.stop();
    await onSend(value, images);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files ?? []);
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const model = modelsInfo?.models.find((m) => m.id === (options.model ?? user?.settings.model));
  const webSearch = options.webSearch ?? user?.settings.webSearch ?? false;
  const tools = options.tools ?? user?.settings.tools ?? true;
  const useDocuments = options.useDocuments ?? user?.settings.useDocuments ?? false;

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "glass relative flex flex-col gap-2 rounded-3xl p-2 shadow-lg transition-colors focus-within:border-brand-500/60",
          dragging && "border-brand-500 bg-brand-500/5",
        )}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-bg-elevated/80 text-sm font-medium text-brand-500">
            <ImagePlus className="mr-2 size-5" /> {t("composer.dropHere")}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2 pt-1">
            {attachments.map((a) => (
              <div key={a.id} className="group/att relative size-20 overflow-hidden rounded-xl border border-border">
                <img src={a.preview} alt="" className="size-full object-cover" />
                {!a.uploaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 text-[10px] text-white">
                    <Spinner className="size-4" />
                    {a.progress}%
                  </div>
                )}
                <button type="button" aria-label={t("common.delete")} onClick={() => removeAttachment(a.id)} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover/att:opacity-100">
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          rows={1}
          placeholder={useDocuments ? t("composer.placeholderDoc") : t("composer.placeholder")}
          aria-label={t("composer.placeholder")}
          disabled={quotaReached}
          className="max-h-60 w-full resize-none bg-transparent px-3 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-fg-subtle disabled:opacity-50"
        />

        <div className="flex items-center gap-1 px-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = ""; // allow picking the same file again
            }}
          />
          <IconButton size="sm" label={t("composer.attach")} onClick={() => fileInputRef.current?.click()} disabled={!features?.imageUploads || attachments.length >= MAX_ATTACHMENTS}>
            <ImagePlus />
          </IconButton>
          {speech.supported && (
            <IconButton size="sm" label={speech.listening ? t("composer.listening") : t("composer.voice")} active={speech.listening} onClick={speech.toggle}>
              {speech.listening ? <MicOff /> : <Mic />}
            </IconButton>
          )}
          <IconButton size="sm" label={t("composer.templates")} onClick={() => setDialog("templates")}>
            <BookText />
          </IconButton>
          <IconButton size="sm" label={t("composer.summarizeUrl")} onClick={() => setDialog("url")}>
            <Link />
          </IconButton>
          {features?.imageGeneration && (
            <IconButton size="sm" label={t("composer.generateImage")} onClick={() => setDialog("image")}>
              <Sparkles />
            </IconButton>
          )}

          <span className="mx-1 h-5 w-px bg-border" />

          <ModelPicker value={options.model ?? user?.settings.model} onChange={(m) => setOptions({ model: m })} compact />
          <ToggleChip active={webSearch} disabled={!features?.webSearch || !model?.supportsWebSearch} label={t("composer.webSearch")} icon={<Globe />} onClick={() => setOptions({ webSearch: !webSearch })} />
          <ToggleChip active={tools && !webSearch} disabled={!features?.tools || !model?.supportsTools || webSearch} label={t("composer.tools")} icon={<Wrench />} onClick={() => setOptions({ tools: !tools })} />
          <ToggleChip active={useDocuments} disabled={!features?.documents} label={t("composer.documents")} icon={<FileSearch />} onClick={() => setOptions({ useDocuments: !useDocuments })} />

          <div className="ml-auto">
            {streaming ? (
              <IconButton size="md" variant="secondary" label={t("composer.stop")} onClick={onStop} className="rounded-full">
                <Square className="fill-current" />
              </IconButton>
            ) : (
              <IconButton size="md" variant="primary" label={t("composer.send")} onClick={() => void submit()} disabled={!canSend} className="rounded-full">
                {uploading ? <Spinner className="size-4" /> : <ArrowUp />}
              </IconButton>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2 hidden text-center text-[11px] text-fg-subtle sm:block">
        {quotaReached ? t("composer.quotaReached") : quota?.limit ? t("composer.quota", { remaining: quota.remaining, limit: quota.limit }) : t("composer.hint")}
      </p>

      <PromptPickerDialog open={dialog === "templates"} onClose={() => setDialog(null)} onPick={(content) => setText((prev) => (prev ? `${prev}\n${content}` : content))} />
      <UrlDialog open={dialog === "url"} onClose={() => setDialog(null)} onResult={(prompt) => setText(prompt)} />
      <ImageGenDialog open={dialog === "image"} onClose={() => setDialog(null)} chatId={chatId} />
    </div>
  );
}

function ToggleChip({ active, disabled, label, icon, onClick }: { active: boolean; disabled?: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      disabled={disabled}
      title={label}
      onClick={onClick}
      className={cn(
        "hidden h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors sm:inline-flex [&>svg]:size-3.5",
        active ? "bg-brand-500/15 text-brand-500" : "text-fg-muted hover:bg-bg-hover hover:text-fg",
        disabled && "opacity-40",
      )}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
