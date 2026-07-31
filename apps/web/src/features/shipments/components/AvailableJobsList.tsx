"use client";

import { useState, useTransition } from "react";
import { acceptJobAction } from "../actions";
import { messages } from "../messages";
import type { ShipmentRecord } from "../service";

type JobRow = ShipmentRecord & {
  amountLabel: string | null;
  zoneName: string;
  sizeName: string;
  windowLabel: string | null;
};

export function AvailableJobsList({ jobs }: { jobs: JobRow[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (jobs.length === 0) {
    return <p className="text-ink-secondary">{messages.jobsEmpty}</p>;
  }

  return (
    <div className="space-y-4">
      {feedback ? <p className="text-sm text-ink">{feedback}</p> : null}
      <ul className="space-y-3">
        {jobs.map((job) => {
          const busy = isPending && pendingId === job.id;
          return (
            <li
              key={job.id}
              className="rounded-md border border-border bg-white p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-ink">
                  {job.zoneName}
                  {job.isExpress ? " Â· Ekspres" : ""}
                </span>
                <span className="text-ink">{job.amountLabel ?? "â€”"}</span>
              </div>
              <p className="text-sm text-ink-secondary">{job.pickupAddress}</p>
              <p className="text-sm text-ink-secondary">â†’ {job.dropoffAddress}</p>
              <p className="text-xs text-ink-secondary">
                {job.sizeName}
                {job.windowLabel ? ` Â· ${job.windowLabel}` : ""}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setFeedback(null);
                  setPendingId(job.id);
                  startTransition(async () => {
                    const result = await acceptJobAction({ shipmentId: job.id });
                    setFeedback(result.message);
                    setPendingId(null);
                  });
                }}
                className="min-h-12 w-full rounded-md bg-yolla-blue px-4 py-3 text-base font-medium text-white hover:bg-yolla-blue-dark disabled:opacity-60"
              >
                {busy ? "Kabul ediliyorâ€¦" : messages.acceptCta}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
