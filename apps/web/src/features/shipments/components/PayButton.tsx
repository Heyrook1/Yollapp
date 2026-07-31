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
        className="min-h-11 rounded-md bg-yolla-blue px-4 py-2 text-sm text-white hover:bg-yolla-blue-dark disabled:opacity-60"
      >
        {pending ? "Ä°ÅŸleniyorâ€¦" : messages.payCta}
      </button>
      {feedback ? <p className="text-xs text-ink-secondary">{feedback}</p> : null}
    </div>
  );
}
