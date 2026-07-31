import { messages } from "../messages";
import type { ShipmentRecord } from "../service";

type JobRow = ShipmentRecord & {
  amountLabel: string | null;
  zoneName: string;
  sizeName: string;
};

export function MyJobsList({ jobs }: { jobs: JobRow[] }) {
  if (jobs.length === 0) {
    return <p className="text-brand-700">{messages.myJobsEmpty}</p>;
  }

  return (
    <ul className="space-y-3">
      {jobs.map((job) => (
        <li key={job.id} className="rounded-md border border-brand-200 bg-white p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-brand-900">
              {messages.status[job.status]}
            </span>
            <span className="text-brand-800">{job.amountLabel ?? "—"}</span>
          </div>
          <p className="mt-2 text-brand-700">
            {job.zoneName} · {job.sizeName}
            {job.isExpress ? " · Ekspres" : ""}
          </p>
          <p className="text-brand-600">{job.pickupAddress}</p>
          <p className="text-brand-600">→ {job.dropoffAddress}</p>
        </li>
      ))}
    </ul>
  );
}
