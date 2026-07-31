import Link from "next/link";
import { DomainError } from "@yolla/core";
import { getSession } from "@/lib/auth";
import { CreateShipmentForm } from "@/features/shipments/components/CreateShipmentForm";
import { queryCatalog } from "@/features/shipments/queries";
import { messages } from "@/features/shipments/messages";

export const dynamic = "force-dynamic";

export default async function NewShipmentPage() {
  const session = await getSession();
  if (!session) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">{messages.createTitle}</h1>
        <p className="text-brand-700">{messages.unauthorized}</p>
        <Link href="/login?next=/sender/shipments/new" className="underline">
          Giriş yap
        </Link>
      </section>
    );
  }

  let catalog: Awaited<ReturnType<typeof queryCatalog>> = { zones: [], sizeClasses: [] };
  let loadError: string | null = null;
  try {
    catalog = await queryCatalog();
  } catch (error) {
    console.error(
      "catalog query failed",
      error instanceof DomainError ? error.code : "unknown",
    );
    loadError = messages.genericError;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-brand-900">{messages.createTitle}</h1>
        <Link href="/sender/shipments" className="text-sm text-brand-700 underline">
          {messages.listTitle}
        </Link>
      </div>
      {loadError ? (
        <p className="text-red-700">{loadError}</p>
      ) : (
        <CreateShipmentForm zones={catalog.zones} sizeClasses={catalog.sizeClasses} />
      )}
    </section>
  );
}
