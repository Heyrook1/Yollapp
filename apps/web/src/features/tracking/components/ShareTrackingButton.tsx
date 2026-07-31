"use client";

import { useState, useTransition } from "react";
import { createTrackingLinkAction } from "../actions";
import { CheckIcon, ShareIcon } from "@/components/ui/icons";

export function ShareTrackingButton({ shipmentId }: { shipmentId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createTrackingLinkAction({ shipmentId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const absolute = `${window.location.origin}${result.url}`;
      setUrl(absolute);
      try {
        await navigator.clipboard.writeText(absolute);
        setCopied(true);
      } catch {
        // Pano izni yoksa link yine de gösterilir.
        setCopied(false);
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={create}
        disabled={pending}
        className="flex min-h-11 items-center gap-2 text-sm font-extrabold text-primary disabled:opacity-60"
      >
        {copied ? <CheckIcon size={16} strokeWidth={3} /> : <ShareIcon size={16} />}
        {pending
          ? "Link oluşturuluyor…"
          : copied
            ? "Link kopyalandı"
            : "Takip linki oluştur"}
      </button>

      {url ? (
        <p className="break-all rounded-2xl bg-fill-soft px-3 py-2 text-xs font-semibold text-ink-secondary">
          {url}
          <span className="block pt-1 text-ink-faint">
            14 gün geçerli · alıcı bilgileri kısıtlı gösterilir
          </span>
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
