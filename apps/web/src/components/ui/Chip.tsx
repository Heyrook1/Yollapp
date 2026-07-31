"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

/** Pill chip — seçilebilir (buton) ya da salt etiket. Seçim yalnız renkle anlatılmaz (aria-pressed). */
export function Chip({ children, selected, onClick, disabled, className = "" }: Props) {
  const classes = `inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-extrabold transition ${
    selected ? "bg-navy text-ink-inverse" : "bg-fill text-ink-secondary hover:bg-border/60"
  } disabled:opacity-50 ${className}`;

  if (!onClick) {
    return <span className={classes}>{children}</span>;
  }
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
