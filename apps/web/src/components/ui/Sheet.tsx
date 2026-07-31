"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";

/** Ekran altına sabitlenen v4 alt sayfa paneli (statik yerleşim). */
export function SheetPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-t-[32px] bg-surface-elevated px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3 shadow-sheet ${className}`}
    >
      <span className="mx-auto mb-4 block h-1.5 w-11 rounded-full bg-border" aria-hidden />
      {children}
    </div>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger" | "success";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Geri alınamaz aksiyonlar için onay diyaloğu (native <dialog>, Esc + odak yönetimi). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Vazgeç",
  tone = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
      className="m-auto w-[min(92vw,24rem)] rounded-[24px] bg-surface-elevated p-6 text-ink shadow-card backdrop:bg-navy/50"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
          {description ? (
            <p className="text-sm font-semibold text-ink-secondary">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2.5">
          <Button variant={tone} loading={loading} onClick={onConfirm} className="w-full">
            {confirmLabel}
          </Button>
          <Button variant="soft" disabled={loading} onClick={onCancel} className="w-full">
            {cancelLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
