import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, ArchiveRestore, Download, FolderInput, Link2, MoreHorizontal, Pencil, Pin, PinOff, Settings2, Tag, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { downloadExport, useChatMeta, useDeleteChat, useUpdateChat } from "@/hooks/useChats";
import type { ChatSummary } from "@/types/api";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/Button";
import { ConfirmDialog, Dialog, PromptDialog } from "@/components/ui/Dialog";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { ChatSettingsDialog, ShareDialog, TagsDialog } from "./ChatDialogs";

type DialogKind = "rename" | "delete" | "share" | "tags" | "folder" | "settings" | null;

interface ChatMenuProps {
  chat: ChatSummary & { systemInstruction?: string };
  /** Whether the menu is shown for the currently open chat (delete navigates away). */
  isCurrent?: boolean;
  className?: string;
}

/** Context menu with every per-chat action. Used in the sidebar and the chat header. */
export function ChatMenu({ chat, isCurrent, className }: ChatMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const update = useUpdateChat();
  const remove = useDeleteChat();
  const { data: meta } = useChatMeta();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const close = () => setDialog(null);

  const patch = (p: Parameters<typeof update.mutate>[0]["patch"]) => update.mutate({ id: chat._id, patch: p });

  const exportAs = async (format: "md" | "json" | "pdf") => {
    try {
      await downloadExport(chat._id, chat.title, format);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  return (
    <>
      <Menu className={className}>
        <MenuTrigger>
          <IconButton size="sm" label={t("chat.chatSettings")}>
            <MoreHorizontal />
          </IconButton>
        </MenuTrigger>
        <MenuContent className="w-56">
          <MenuItem icon={<Pencil />} onSelect={() => setDialog("rename")}>
            {t("chat.rename")}
          </MenuItem>
          <MenuItem icon={chat.pinned ? <PinOff /> : <Pin />} onSelect={() => patch({ pinned: !chat.pinned })}>
            {chat.pinned ? t("chat.unpin") : t("chat.pin")}
          </MenuItem>
          <MenuItem icon={<Tag />} onSelect={() => setDialog("tags")}>
            {t("chat.tags")}
          </MenuItem>
          <MenuItem icon={<FolderInput />} onSelect={() => setDialog("folder")}>
            {t("chat.moveToFolder")}
          </MenuItem>
          <MenuItem icon={<Settings2 />} onSelect={() => setDialog("settings")}>
            {t("chat.chatSettings")}
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Link2 />} onSelect={() => setDialog("share")}>
            {t("chat.share")}
          </MenuItem>
          <MenuLabel>{t("chat.export")}</MenuLabel>
          <MenuItem icon={<Download />} onSelect={() => void exportAs("md")}>
            {t("chat.exportMd")}
          </MenuItem>
          <MenuItem icon={<Download />} onSelect={() => void exportAs("pdf")}>
            {t("chat.exportPdf")}
          </MenuItem>
          <MenuItem icon={<Download />} onSelect={() => void exportAs("json")}>
            {t("chat.exportJson")}
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={chat.archived ? <ArchiveRestore /> : <Archive />} onSelect={() => patch({ archived: !chat.archived })}>
            {chat.archived ? t("chat.unarchive") : t("chat.archive")}
          </MenuItem>
          <MenuItem icon={<Trash2 />} danger onSelect={() => setDialog("delete")}>
            {t("chat.delete")}
          </MenuItem>
        </MenuContent>
      </Menu>

      <PromptDialog open={dialog === "rename"} onClose={close} title={t("chat.rename")} initialValue={chat.title} onSubmit={(title) => patch({ title })} />
      <FolderDialog open={dialog === "folder"} onClose={close} current={chat.folder} folders={meta?.folders ?? []} onSubmit={(folder) => patch({ folder })} />
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={close}
        title={t("chat.delete")}
        description={t("chat.deleteConfirm")}
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          await remove.mutateAsync(chat._id);
          if (isCurrent) navigate("/dashboard");
        }}
      />
      <ShareDialog chat={chat} open={dialog === "share"} onClose={close} />
      <TagsDialog chat={chat} open={dialog === "tags"} onClose={close} />
      <ChatSettingsDialog chat={chat} open={dialog === "settings"} onClose={close} />
    </>
  );
}

function FolderDialog({ open, onClose, current, folders, onSubmit }: { open: boolean; onClose: () => void; current: string; folders: string[]; onSubmit: (folder: string) => void }) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);

  if (creating) {
    return (
      <PromptDialog
        open={open}
        onClose={() => {
          setCreating(false);
          onClose();
        }}
        title={t("chat.newFolder")}
        placeholder={t("chat.folder")}
        onSubmit={(folder) => {
          onSubmit(folder);
          setCreating(false);
        }}
      />
    );
  }

  const options = ["", ...folders];
  return (
    <Dialog open={open} onClose={onClose} title={t("chat.moveToFolder")} size="sm">
      <div className="flex flex-col gap-0.5">
        {options.map((folder) => (
          <button
            key={folder || "__none"}
            type="button"
            onClick={() => {
              onSubmit(folder);
              onClose();
            }}
            className={cn("flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-bg-hover", folder === current && "bg-brand-500/10 text-brand-500")}
          >
            {folder || t("chat.noFolder")}
          </button>
        ))}
        <button type="button" onClick={() => setCreating(true)} className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-brand-500 hover:bg-bg-hover">
          + {t("chat.newFolder")}
        </button>
      </div>
    </Dialog>
  );
}
