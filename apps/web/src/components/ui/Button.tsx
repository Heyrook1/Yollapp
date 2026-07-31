import Link from "next/link";
import type { ReactNode } from "react";

type Variant =
  | "primary"
  | "dark"
  | "secondary"
  | "soft"
  | "ghost"
  | "danger"
  | "success";

type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-[#186BFF] to-[#0050EB] text-ink-inverse shadow-primary hover:from-[#2a77ff] hover:to-[#0057ff] active:translate-y-px disabled:opacity-60 disabled:shadow-none",
  dark: "bg-navy text-ink-inverse hover:bg-[#16233c] active:translate-y-px disabled:opacity-60",
  secondary:
    "border-[1.5px] border-border bg-surface-elevated text-ink hover:bg-fill disabled:opacity-60",
  soft: "bg-fill text-ink hover:bg-border/60 disabled:opacity-60",
  ghost: "text-primary hover:bg-primary-soft disabled:opacity-60",
  danger: "bg-danger text-ink-inverse hover:opacity-90 disabled:opacity-60",
  success:
    "bg-gradient-to-b from-[#2ECC71] to-[#1FA85A] text-ink-inverse shadow-[0_12px_32px_rgba(34,197,94,0.4)] hover:opacity-95 disabled:opacity-60 disabled:shadow-none",
};

const sizeClass: Record<Size, string> = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-13 px-5 text-base",
  lg: "min-h-14 px-6 text-lg",
};

type ButtonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  "aria-label"?: string;
};

function Spinner() {
  return (
    <span
      className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  href,
  type = "button",
  disabled,
  loading = false,
  onClick,
  ...aria
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-full font-extrabold tracking-tight transition ${variantClass[variant]} ${sizeClass[size]} ${className}`;

  if (href && !disabled && !loading) {
    return (
      <Link href={href} className={classes} {...aria}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={classes}
      aria-busy={loading || undefined}
      {...aria}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}
