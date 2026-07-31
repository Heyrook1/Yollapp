import Link from "next/link";
import { PayButton } from "./PayButton";
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
        <p className="text-ink-secondary">{messages.listEmpty}</p>
        <Link href="/sender/shipments/new" className="text-ink-secondary underline">
          {messages.createTitle}
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {shipments.map((s) => (
        <li key={s.id} className="rounded-md border border-border bg-white p-4 text-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-ink">
              {messages.status[s.status]}
            </span>
            <span className="text-ink">{s.amountLabel ?? "â€”"}</span>
          </div>
          <p className="text-ink-secondary">
            {s.zoneName} Â· {s.sizeName}
            {s.isExpress ? " Â· Ekspres" : ""}
          </p>
          <p className="text-ink-secondary">{s.dropoffAddress}</p>
          {s.status === "QUOTED" ? <PayButton shipmentId={s.id} /> : null}
        </li>
      ))}
    </ul>
  );
}
