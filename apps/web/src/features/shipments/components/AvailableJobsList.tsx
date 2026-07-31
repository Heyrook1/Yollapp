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
    return <p className="text-brand-700">{messages.jobsEmpty}</p>;
  }

  return (
    <div className="space-y-4">
      {feedback ? <p className="text-sm text-brand-800">{feedback}</p> : null}
      <ul className="space-y-3">
        {jobs.map((job) => {
          const busy = isPending && pendingId === job.id;
          return (
            <li
              key={job.id}
              className="rounded-md border border-brand-200 bg-white p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-brand-900">
                  {job.zoneName}
                  {job.isExpress ? " · Ekspres" : ""}
                </span>
                <span className="text-brand-800">{job.amountLabel ?? "—"}</span>
              </div>
              <p className="text-sm text-brand-700">{job.pickupAddress}</p>
              <p className="text-sm text-brand-700">→ {job.dropoffAddress}</p>
              <p className="text-xs text-brand-600">
                {job.sizeName}
                {job.windowLabel ? ` · ${job.windowLabel}` : ""}
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
                className="min-h-12 w-full rounded-md bg-brand-600 px-4 py-3 text-base font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {busy ? "Kabul ediliyor…" : messages.acceptCta}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
