import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-xl border border-border bg-bg-elevated px-3.5 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:border-brand-500 focus:outline-none disabled:opacity-50";

const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238d89a0' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`;

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(fieldBase, "h-10", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(fieldBase, "h-10 appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9", className)} style={{ backgroundImage: chevron }} {...props}>
      {children}
    </select>
  );
});

/**
 * Labelled form row. With `htmlFor` it renders a real <label>; otherwise it becomes a labelled
 * group, which suits composite controls such as sliders and segmented controls.
 */
export function Field({ label, hint, children, htmlFor, className }: { label: string; hint?: string; children: ReactNode; htmlFor?: string; className?: string }) {
  const labelId = useId();
  const labelClass = "text-sm font-medium";
  if (htmlFor) {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
        {children}
        {hint && <p className="text-xs text-fg-muted">{hint}</p>}
      </div>
    );
  }
  return (
    <div role="group" aria-labelledby={labelId} className={cn("flex flex-col gap-1.5", className)}>
      <span id={labelId} className={labelClass}>
        {label}
      </span>
      {children}
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}

export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4 rounded-xl px-1 py-2", disabled && "opacity-50")}>
      <span className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        {description && <span className="text-xs text-fg-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-brand-500" : "bg-border-strong")}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
    </label>
  );
}

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  "aria-label": string;
}

export function Slider({ value, min, max, step, onChange, format, "aria-label": ariaLabel }: SliderProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer accent-brand-500"
      />
      <span className="w-12 text-right font-mono text-xs text-fg-muted">{format ? format(value) : value}</span>
    </div>
  );
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function SegmentedControl<T extends string>({ value, options, onChange, size = "md", "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex rounded-xl bg-bg-muted p-1" role="radiogroup" aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg font-medium transition-colors",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
            value === opt.value ? "bg-bg-elevated text-fg shadow-sm" : "text-fg-muted hover:text-fg",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
