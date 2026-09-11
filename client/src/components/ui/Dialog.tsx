import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { IconButton } from "./Button";
import { Input } from "./Form";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Accessible modal dialog using the native <dialog> element. */
export function Dialog({ open, onClose, title, description, children, footer, size = "md", className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [onClose]);

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

  return createPortal(
    <dialog
      ref={ref}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-3xl bg-transparent p-0 text-fg backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-slide-up",
        widths[size],
      )}
    >
      <div className={cn("surface flex max-h-[85vh] flex-col rounded-3xl", className)}>
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div>
              {title && <h2 className="font-display text-lg font-semibold">{title}</h2>}
              {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
            </div>
            <IconButton label={t("common.close")} size="sm" onClick={onClose}>
              <X />
            </IconButton>
          </div>
        )}
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>}
      </div>
    </dialog>,
    document.body,
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  /** When set, the user must type this word to enable the confirm button. */
  typeToConfirm?: string;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, danger = true, typeToConfirm }: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = !typeToConfirm || typed === typeToConfirm;

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant={danger ? "danger" : "primary"} disabled={!ready} loading={busy} onClick={confirm}>
            {confirmLabel ?? t("common.confirm")}
          </Button>
        </>
      }
    >
      {typeToConfirm && (
        <Input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={typeToConfirm} aria-label={typeToConfirm} className="font-mono" />
      )}
    </Dialog>
  );
}

/** Small text-input dialog used for rename / new folder. */
export function PromptDialog({ open, onClose, onSubmit, title, initialValue = "", placeholder, submitLabel }: { open: boolean; onClose: () => void; onSubmit: (value: string) => void | Promise<void>; title: string; initialValue?: string; placeholder?: string; submitLabel?: string }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  const submit = async () => {
    const v = value.trim();
    if (!v) return;
    await onSubmit(v);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!value.trim()}>
            {submitLabel ?? t("common.save")}
          </Button>
        </>
      }
    >
      <Input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void submit()}
        aria-label={title}
      />
    </Dialog>
  );
}
