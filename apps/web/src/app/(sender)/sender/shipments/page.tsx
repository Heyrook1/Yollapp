import Link from "next/link";
import { DomainError } from "@yolla/core";
import { getSession } from "@/lib/auth";
import { queryMyShipments } from "@/features/shipments/queries";
import { ShipmentStatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ChevronRightIcon, PackageIcon, PlusIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function SenderShipmentsPage() {
  const session = await getSession();
  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 pb-32">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Gönderilerim</h1>
        <p className="font-semibold text-ink-secondary">Gönderilerini görmek için giriş yap.</p>
        <Button href="/login?next=/sender/shipments" size="lg" className="w-full">
          Giriş yap
        </Button>
      </main>
    );
  }

  let shipments: Awaited<ReturnType<typeof queryMyShipments>> = [];
  let loadError = false;
  try {
    shipments = await queryMyShipments();
  } catch (error) {
    console.error(
      "list shipments failed",
      error instanceof DomainError ? error.code : "unknown",
    );
    loadError = true;
  }

  return (
    <main className="mx-auto max-w-lg px-6 pb-32">
      <div className="flex items-end justify-between pt-[max(3.5rem,env(safe-area-inset-top))]">
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-ink">Gönderilerim</h1>
        <Button href="/sender/shipments/new" size="sm">
          <PlusIcon size={16} strokeWidth={2.5} /> Yeni
        </Button>
      </div>

      <div className="pt-5">
        {loadError ? (
          <ErrorState
            title="Gönderiler yüklenemedi"
            action={<Button href="/sender/shipments">Tekrar dene</Button>}
          />
        ) : shipments.length === 0 ? (
          <EmptyState
            icon={<PackageIcon size={26} />}
            title="Henüz gönderin yok"
            description="İlk paketini gönder — bölgeni ve boyutunu seç, fiyatı anında gör."
            action={<Button href="/sender/shipments/new">Paket gönder</Button>}
          />
        ) : (
          <ul>
            {shipments.map((s) => (
              <li key={s.id} className="border-b border-line last:border-0">
                <Link
                  href={`/sender/shipments/${s.id}`}
                  className="flex items-center gap-3.5 py-4"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-[16px] bg-fill text-ink-secondary">
                    <PackageIcon size={20} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-extrabold text-ink">
                        {s.recipientName}
                      </span>
                      <ShipmentStatusBadge status={s.status} />
                    </span>
                    <span className="truncate text-xs font-semibold text-ink-faint">
                      {s.zoneName} · {s.sizeName}
                      {s.windowLabel ? ` · ${s.windowLabel}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    {s.amountLabel ? (
                      <span className="tnum text-[15px] font-extrabold text-ink">
                        {s.amountLabel}
                      </span>
                    ) : null}
                    <ChevronRightIcon size={18} className="text-ink-faint" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
