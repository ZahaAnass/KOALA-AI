import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Feedback";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/20",
  secondary: "bg-bg-muted text-fg hover:bg-bg-hover",
  ghost: "text-fg-muted hover:bg-bg-hover hover:text-fg",
  outline: "border border-border-strong text-fg hover:bg-bg-hover",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, leftIcon, rightIcon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-colors select-none",
        "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: Size;
  variant?: Variant;
  active?: boolean;
}

/** Square button for a single icon. `label` doubles as tooltip and accessible name. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = "md", variant = "ghost", active, className, children, ...props },
  ref,
) {
  const dims = size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-9";
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center justify-center rounded-lg transition-colors [&>svg]:size-[1.15rem]",
        "disabled:opacity-40 disabled:pointer-events-none active:scale-95",
        variants[variant],
        active && "bg-brand-500/15 text-brand-500 hover:bg-brand-500/20",
        dims,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
