import Link from "next/link";
import { DomainError } from "@yolla/core";
import { getSession } from "@/lib/auth";
import { NewShipmentWizard } from "@/features/shipments/components/NewShipmentWizard";
import { queryCatalog } from "@/features/shipments/queries";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default function NewShipmentPage() {
  return <NewShipmentGate />;
}

async function NewShipmentGate() {
  const session = await getSession();
  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 pb-32">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Paket gönder</h1>
        <p className="font-semibold text-ink-secondary">Devam etmek için giriş yap.</p>
        <Button href="/login?next=/sender/shipments/new" size="lg" className="w-full">
          Giriş yap
        </Button>
        <Link href="/sender" className="text-center text-sm font-bold text-ink-secondary">
          Geri dön
        </Link>
      </main>
    );
  }

  let catalog: Awaited<ReturnType<typeof queryCatalog>> = { zones: [], sizeClasses: [] };
  let loadError = false;
  try {
    catalog = await queryCatalog();
  } catch (error) {
    console.error(
      "catalog query failed",
      error instanceof DomainError ? error.code : "unknown",
    );
    loadError = true;
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-lg px-6 py-24">
        <ErrorState
          title="Katalog yüklenemedi"
          description="Bölge ve boyut bilgileri alınamadı. Lütfen tekrar deneyin."
          action={<Button href="/sender/shipments/new">Tekrar dene</Button>}
        />
      </main>
    );
  }

  return <NewShipmentWizard zones={catalog.zones} sizeClasses={catalog.sizeClasses} />;
}
