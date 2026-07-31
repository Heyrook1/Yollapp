import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-yolla-blue text-ink-inverse hover:bg-yolla-blue-dark disabled:opacity-60",
  secondary:
    "border border-border bg-surface-elevated text-ink hover:bg-yolla-blue-soft disabled:opacity-60",
  ghost: "text-yolla-blue hover:bg-yolla-blue-soft disabled:opacity-60",
  danger: "bg-danger text-ink-inverse hover:opacity-90 disabled:opacity-60",
};

type ButtonProps = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
};

export function Button({
  children,
  variant = "primary",
  className = "",
  href,
  type = "button",
  disabled,
  onClick,
}: ButtonProps) {
  const classes = `inline-flex min-h-12 items-center justify-center rounded-[12px] px-4 py-3 text-base font-semibold transition ${variantClass[variant]} ${className}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
