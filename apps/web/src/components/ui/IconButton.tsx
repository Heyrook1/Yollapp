import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "float" | "fill" | "dark" | "danger-soft";

const variantClass: Record<Variant, string> = {
  float: "bg-surface-elevated text-ink shadow-float",
  fill: "bg-fill text-ink",
  dark: "bg-navy text-ink-inverse",
  "danger-soft": "bg-danger-soft text-danger",
};

type Props = {
  children: ReactNode;
  label: string;
  variant?: Variant;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
};

/** 48px circular icon button — minimum 44px touch target everywhere. */
export function IconButton({
  children,
  label,
  variant = "fill",
  href,
  onClick,
  disabled,
  className = "",
  type = "button",
}: Props) {
  const classes = `inline-flex size-12 shrink-0 items-center justify-center rounded-full transition hover:opacity-90 disabled:opacity-50 ${variantClass[variant]} ${className}`;

  if (href && !disabled) {
    return (
      <Link href={href} aria-label={label} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type={type}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
}
