import { messages } from "../messages";
import type { ShipmentRecord } from "../service";

type JobRow = ShipmentRecord & {
  amountLabel: string | null;
  zoneName: string;
  sizeName: string;
};

export function MyJobsList({ jobs }: { jobs: JobRow[] }) {
  if (jobs.length === 0) {
    return <p className="text-ink-secondary">{messages.myJobsEmpty}</p>;
  }

  return (
    <ul className="space-y-3">
      {jobs.map((job) => (
        <li key={job.id} className="rounded-md border border-border bg-white p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-ink">
              {messages.status[job.status]}
            </span>
            <span className="text-ink">{job.amountLabel ?? "â€”"}</span>
          </div>
          <p className="mt-2 text-ink-secondary">
            {job.zoneName} Â· {job.sizeName}
            {job.isExpress ? " Â· Ekspres" : ""}
          </p>
          <p className="text-ink-secondary">{job.pickupAddress}</p>
          <p className="text-ink-secondary">â†’ {job.dropoffAddress}</p>
        </li>
      ))}
    </ul>
  );
}
