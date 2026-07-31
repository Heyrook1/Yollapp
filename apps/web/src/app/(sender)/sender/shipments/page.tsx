import Link from "next/link";
import { DomainError } from "@yolla/core";
import { getSession } from "@/lib/auth";
import { ShipmentList } from "@/features/shipments/components/ShipmentList";
import { queryMyShipments } from "@/features/shipments/queries";
import { messages } from "@/features/shipments/messages";

export const dynamic = "force-dynamic";

export default async function SenderShipmentsPage() {
  const session = await getSession();
  if (!session) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">{messages.listTitle}</h1>
        <p className="text-ink-secondary">{messages.unauthorized}</p>
        <Link href="/login?next=/sender/shipments" className="underline">
          GiriÅŸ yap
        </Link>
      </section>
    );
  }

  let shipments: Awaited<ReturnType<typeof queryMyShipments>> = [];
  let loadError: string | null = null;
  try {
    shipments = await queryMyShipments();
  } catch (error) {
    console.error(
      "list shipments failed",
      error instanceof DomainError ? error.code : "unknown",
    );
    loadError = messages.genericError;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">{messages.listTitle}</h1>
        <Link
          href="/sender/shipments/new"
          className="rounded-md bg-yolla-blue px-3 py-2 text-sm text-white hover:bg-yolla-blue-dark"
        >
          {messages.createTitle}
        </Link>
      </div>
      {loadError ? <p className="text-red-700">{loadError}</p> : <ShipmentList shipments={shipments} />}
    </section>
  );
}
