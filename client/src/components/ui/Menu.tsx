import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MenuContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  id: string;
}
const MenuContext = createContext<MenuContextValue | null>(null);

/**
 * Small dropdown menu with click-outside, Escape and arrow-key handling.
 *
 *   <Menu>
 *     <MenuTrigger><IconButton .../></MenuTrigger>
 *     <MenuContent>
 *       <MenuItem onSelect={...}>Rename</MenuItem>
 *     </MenuContent>
 *   </Menu>
 */
export function Menu({ children, className }: { children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <MenuContext.Provider value={{ open, setOpen, id }}>
      <div ref={ref} className={cn("relative inline-flex", className)}>
        {children}
      </div>
    </MenuContext.Provider>
  );
}

function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("Menu components must be used inside <Menu>");
  return ctx;
}

type TriggerProps = { onClick?: (e: React.MouseEvent) => void; "aria-haspopup"?: string; "aria-expanded"?: boolean; "aria-controls"?: string };

/** Wraps a single button element and attaches the menu ARIA attributes and toggle handler to it. */
export function MenuTrigger({ children }: { children: ReactElement<TriggerProps> }) {
  const { open, setOpen, id } = useMenu();
  const child = Children.only(children);
  if (!isValidElement<TriggerProps>(child)) return null;
  return cloneElement(child, {
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? id : undefined,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      child.props.onClick?.(e);
      setOpen(!open);
    },
  });
}

const ITEM_SELECTOR = '[role="menuitem"]:not([disabled])';

export function MenuContent({ children, align = "end", className }: { children: ReactNode; align?: "start" | "end"; className?: string }) {
  const { open, id } = useMenu();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus();
  }, [open]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    const moves: Record<string, number> = { ArrowDown: current + 1, ArrowUp: current - 1, Home: 0, End: items.length - 1 };
    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    items[(next + items.length) % items.length]?.focus();
  };

  if (!open) return null;
  return (
    <div
      ref={ref}
      id={id}
      role="menu"
      onKeyDown={onKeyDown}
      className={cn("surface absolute top-full z-50 mt-1.5 min-w-44 rounded-xl p-1.5 animate-fade-in", align === "end" ? "right-0" : "left-0", className)}
    >
      {children}
    </div>
  );
}

export function MenuItem({ children, onSelect, icon, danger, disabled, shortcut }: { children: ReactNode; onSelect?: () => void; icon?: ReactNode; danger?: boolean; disabled?: boolean; shortcut?: string }) {
  const { setOpen } = useMenu();
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        setOpen(false);
        onSelect?.();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors [&>svg]:size-4 [&>svg]:shrink-0",
        danger ? "text-red-600 hover:bg-red-500/10 dark:text-red-400" : "text-fg hover:bg-bg-hover",
        disabled && "opacity-50 pointer-events-none",
      )}
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <span className="font-mono text-[10px] text-fg-subtle">{shortcut}</span>}
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{children}</div>;
}
