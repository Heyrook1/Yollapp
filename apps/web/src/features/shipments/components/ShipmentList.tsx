import Link from "next/link";
import { messages } from "../messages";
import type { ShipmentRecord } from "../service";

type Row = ShipmentRecord & {
  amountLabel: string | null;
  zoneName: string;
  sizeName: string;
};

export function ShipmentList({ shipments }: { shipments: Row[] }) {
  if (shipments.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-brand-700">{messages.listEmpty}</p>
        <Link href="/sender/shipments/new" className="text-brand-700 underline">
          {messages.createTitle}
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {shipments.map((s) => (
        <li key={s.id} className="rounded-md border border-brand-200 bg-white p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-brand-900">
              {messages.status[s.status]}
            </span>
            <span className="text-brand-800">{s.amountLabel ?? "—"}</span>
          </div>
          <p className="mt-1 text-brand-700">
            {s.zoneName} · {s.sizeName}
            {s.isExpress ? " · Ekspres" : ""}
          </p>
          <p className="text-brand-600">{s.dropoffAddress}</p>
        </li>
      ))}
    </ul>
  );
}
