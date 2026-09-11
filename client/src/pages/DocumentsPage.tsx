import { useRef, useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Info, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { cn, formatBytes, formatRelative } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/Button";
import { Badge, EmptyState, PageHeader, Skeleton, Spinner } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/Dialog";
import type { KnowledgeDocument } from "@/types/api";

const ACCEPT = ".pdf,.txt,.md,.csv,.json";
const MAX_BYTES = 10 * 1024 * 1024;

function DocumentRow({ doc, onDelete, locale }: { doc: KnowledgeDocument; onDelete: () => void; locale: string }) {
  const { t } = useTranslation();
  return (
    <li className="surface flex items-center gap-4 rounded-2xl p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
        <FileText className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{doc.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
          <span>{formatBytes(doc.size)}</span>
          <span>·</span>
          <span>{t("documents.chunks", { count: doc.chunkCount })}</span>
          <span>·</span>
          <span>{formatRelative(doc.createdAt, locale)}</span>
          {doc.status === "failed" && <Badge tone="danger">{doc.status}</Badge>}
        </p>
      </div>
      <IconButton label={t("documents.delete")} size="sm" onClick={onDelete}>
        <Trash2 />
      </IconButton>
    </li>
  );
}

export default function DocumentsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<KnowledgeDocument | null>(null);

  const { data, isPending } = useQuery({ queryKey: queryKeys.documents, queryFn: api.documents.list });

  const upload = useMutation({
    mutationFn: (file: File) => api.documents.upload(file),
    onSuccess: () => {
      toast.success(t("documents.uploaded"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.documents.remove(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.documents }),
  });

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error(t("documents.dropHint"));
      return;
    }
    upload.mutate(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const documents = data?.items ?? [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-6">
      <PageHeader title={t("documents.title")} subtitle={t("documents.subtitle")} />

      <div className="flex items-start gap-3 rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-500" />
        <p className="text-fg-muted">{t("documents.subtitle")}</p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
          dragging ? "border-brand-500 bg-brand-500/5" : "border-border-strong hover:border-brand-500/60",
        )}
      >
        {upload.isPending ? (
          <>
            <Spinner className="size-8 text-brand-500" />
            <p className="text-sm text-fg-muted">{t("documents.processing")}</p>
          </>
        ) : (
          <>
            <UploadCloud className="size-8 text-fg-subtle" />
            <p className="text-sm font-medium">{t("documents.upload")}</p>
            <p className="text-xs text-fg-muted">{t("documents.dropHint")}</p>
            <Button size="sm" variant="outline" className="mt-1" type="button" onClick={() => inputRef.current?.click()}>
              {t("documents.upload")}
            </Button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      </div>

      {isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState icon={<FileText />} title={t("documents.empty")} description={t("documents.dropHint")} />
      ) : (
        <ul className="flex flex-col gap-3">
          {documents.map((doc) => (
            <DocumentRow key={doc._id} doc={doc} locale={i18n.language} onDelete={() => setPendingDelete(doc)} />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => (pendingDelete ? remove.mutateAsync(pendingDelete._id) : undefined)}
        title={t("documents.delete")}
        description={t("documents.deleteConfirm")}
        confirmLabel={t("common.delete")}
      />
    </div>
  );
}
