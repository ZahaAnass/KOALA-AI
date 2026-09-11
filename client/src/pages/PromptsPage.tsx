import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { useUi } from "@/store/ui";
import { Button, IconButton } from "@/components/ui/Button";
import { Badge, EmptyState, PageHeader, Skeleton } from "@/components/ui/Feedback";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Field, Input, Textarea } from "@/components/ui/Form";
import type { PromptTemplate } from "@/types/api";

type TemplateInput = Pick<PromptTemplate, "title" | "content" | "category" | "icon">;
const EMPTY: TemplateInput = { title: "", content: "", category: "general", icon: "✨" };

function TemplateCard({ template, onUse, onEdit, onDelete }: { template: PromptTemplate; onUse: () => void; onEdit?: () => void; onDelete?: () => void }) {
  const { t } = useTranslation();
  return (
    <article className="surface flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{template.icon}</span>
          <h3 className="font-medium">{template.title}</h3>
        </div>
        <Badge tone="brand">{template.category}</Badge>
      </div>
      <p className="line-clamp-3 whitespace-pre-wrap text-sm text-fg-muted">{template.content}</p>
      <div className="mt-auto flex items-center justify-between">
        <Button size="sm" variant="secondary" leftIcon={<Sparkles className="size-3.5" />} onClick={onUse}>
          {t("prompts.use")}
        </Button>
        {!template.builtin && (
          <div className="flex gap-1">
            <IconButton label={t("prompts.edit")} size="sm" onClick={onEdit}>
              <Pencil />
            </IconButton>
            <IconButton label={t("prompts.delete")} size="sm" onClick={onDelete}>
              <Trash2 />
            </IconButton>
          </div>
        )}
      </div>
    </article>
  );
}

function TemplateDialog({ open, initial, onClose, onSubmit, busy }: { open: boolean; initial: TemplateInput; onClose: () => void; onSubmit: (v: TemplateInput) => void; busy: boolean }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<TemplateInput>(initial);
  const set = (patch: Partial<TemplateInput>) => setForm((f) => ({ ...f, ...patch }));
  const valid = form.title.trim().length > 0 && form.content.trim().length > 0;
  const isEdit = initial.title.length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? t("prompts.edit") : t("prompts.new")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button disabled={!valid} loading={busy} onClick={() => onSubmit({ ...form, title: form.title.trim(), content: form.content.trim(), category: form.category.trim() || "general", icon: form.icon.trim() || "✨" })}>
            {t("prompts.save")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[4.5rem_1fr] gap-3">
          <Field label={t("prompts.iconField")} htmlFor="tpl-icon">
            <Input id="tpl-icon" value={form.icon} maxLength={8} onChange={(e) => set({ icon: e.target.value })} className="text-center text-lg" />
          </Field>
          <Field label={t("prompts.titleField")} htmlFor="tpl-title">
            <Input id="tpl-title" autoFocus value={form.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} />
          </Field>
        </div>
        <Field label={t("prompts.categoryField")} htmlFor="tpl-category">
          <Input id="tpl-category" value={form.category} maxLength={40} onChange={(e) => set({ category: e.target.value })} />
        </Field>
        <Field label={t("prompts.contentField")} htmlFor="tpl-content">
          <Textarea id="tpl-content" value={form.content} maxLength={8000} rows={6} onChange={(e) => set({ content: e.target.value })} />
        </Field>
      </div>
    </Dialog>
  );
}

export default function PromptsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PromptTemplate | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PromptTemplate | null>(null);

  const { data, isPending } = useQuery({ queryKey: queryKeys.prompts, queryFn: api.prompts.list });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.prompts });
  const onError = (err: unknown) => toast.error(err instanceof Error ? err.message : t("common.error"));

  const save = useMutation({
    mutationFn: (input: TemplateInput) => (editing && editing !== "new" ? api.prompts.update(editing._id, input) : api.prompts.create(input)),
    onSuccess: () => {
      toast.success(t("prompts.saved"));
      setEditing(null);
      void invalidate();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.prompts.remove(id),
    onSuccess: () => {
      toast.success(t("prompts.deleted"));
      void invalidate();
    },
    onError,
  });

  const use = (template: PromptTemplate) => {
    useUi.getState().insertIntoComposer(template.content);
    navigate("/dashboard");
  };

  const grid = (items: PromptTemplate[]) => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((tpl) => (
        <TemplateCard key={tpl._id} template={tpl} onUse={() => use(tpl)} onEdit={() => setEditing(tpl)} onDelete={() => setPendingDelete(tpl)} />
      ))}
    </div>
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("prompts.title")}
        subtitle={t("prompts.subtitle")}
        actions={
          <Button leftIcon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
            {t("prompts.new")}
          </Button>
        }
      />

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-base font-semibold">{t("prompts.mine")}</h2>
            {data && data.items.length > 0 ? (
              grid(data.items)
            ) : (
              <EmptyState
                icon={<Sparkles />}
                title={t("prompts.empty")}
                action={
                  <Button size="sm" variant="outline" leftIcon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
                    {t("prompts.new")}
                  </Button>
                }
              />
            )}
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-base font-semibold">{t("prompts.builtin")}</h2>
            {grid(data?.builtin ?? [])}
          </section>
        </>
      )}

      {editing !== null && (
        <TemplateDialog
          key={editing === "new" ? "new" : editing._id}
          open
          initial={editing === "new" ? EMPTY : { title: editing.title, content: editing.content, category: editing.category, icon: editing.icon }}
          onClose={() => setEditing(null)}
          onSubmit={(v) => save.mutate(v)}
          busy={save.isPending}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => (pendingDelete ? remove.mutateAsync(pendingDelete._id) : undefined)}
        title={t("prompts.delete")}
        description={pendingDelete?.title}
        confirmLabel={t("common.delete")}
      />
    </div>
  );
}
