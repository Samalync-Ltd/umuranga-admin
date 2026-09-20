import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-body " +
  "font-medium transition-colors duration-200 ease-[var(--ease-standard)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

// Red is the primary action colour and the destructive colour both, per
// blueprint §11. They are distinguished by weight and border, not hue, so a
// destructive action is never mistaken for a routine one — and neither is
// ever a large red surface.
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-red text-fg-inverse hover:bg-brand-red-hover active:bg-brand-red-active",
  secondary: "border border-border-strong bg-surface text-fg hover:bg-surface-sunken",
  ghost: "text-fg-muted hover:bg-surface-sunken hover:text-fg",
  destructive:
    "border border-brand-red bg-brand-red-subtle text-status-urgent hover:bg-brand-red hover:text-fg-inverse",
};

export function Button({
  variant = "secondary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
