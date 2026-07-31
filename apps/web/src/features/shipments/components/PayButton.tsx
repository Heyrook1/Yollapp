"use client";

import { useState, useTransition } from "react";
import { markPaidAction } from "../actions";
import { messages } from "../messages";

export function PayButton({ shipmentId }: { shipmentId: string }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setFeedback(null);
          startTransition(async () => {
            const result = await markPaidAction({ shipmentId });
            setFeedback(result.message);
          });
        }}
        className="min-h-11 rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "İşleniyor…" : messages.payCta}
      </button>
      {feedback ? <p className="text-xs text-brand-700">{feedback}</p> : null}
    </div>
  );
}
