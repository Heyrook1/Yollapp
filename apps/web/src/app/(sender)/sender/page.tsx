import Link from "next/link";
import { DomainError, type ShipmentStatus } from "@yolla/core";
import { getSession } from "@/lib/auth";
import { queryMyShipments } from "@/features/shipments/queries";
import { NearbyCouriersStrip } from "@/features/maps/components/NearbyCouriersStrip";
import { shipmentStatusMeta } from "@/components/ui/StatusBadge";
import { SegmentedProgress } from "@/components/ui/SegmentedProgress";
import { Button } from "@/components/ui/Button";
import {
  BellIcon,
  DocumentIcon,
  PackageIcon,
  RepeatIcon,
} from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const ACTIVE: ShipmentStatus[] = ["QUOTED", "PAID", "MATCHED", "PICKED_UP", "IN_TRANSIT"];

const progressByStatus: Partial<Record<ShipmentStatus, number>> = {
  QUOTED: 0,
  PAID: 1,
  MATCHED: 2,
  PICKED_UP: 3,
  IN_TRANSIT: 3,
  DELIVERED: 4,
};

function firstNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const name = local.split(/[._-]/)[0] ?? local;
  return name ? name.charAt(0).toLocaleUpperCase("tr-TR") + name.slice(1) : "";
}

export default async function SenderHomePage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 pb-32">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Merhaba</h1>
        <p className="font-semibold text-ink-secondary">
          Paket göndermek için giriş yapman gerekiyor.
        </p>
        <Button href="/login?next=/sender" size="lg" className="w-full">
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
      "sender home query failed",
      error instanceof DomainError ? error.code : "unknown",
    );
    loadError = true;
  }

  const active = shipments.find((s) => ACTIVE.includes(s.status));
  const recent = shipments.filter((s) => s.id !== active?.id).slice(0, 3);
  const name = firstNameFromEmail(session.email);

  return (
    <main className="mx-auto max-w-lg pb-32">
      <div className="flex items-start justify-between px-6 pt-[max(3.5rem,env(safe-area-inset-top))]">
        <h1 className="text-[34px] font-extrabold leading-[1.1] tracking-[-0.035em] text-ink">
          Merhaba{name ? "," : ""}
          {name ? (
            <>
              <br />
              {name}
            </>
          ) : null}
        </h1>
        <span
          className="flex size-12 items-center justify-center rounded-full bg-fill text-ink"
          aria-label="Bildirimler"
        >
          <BellIcon size={22} />
        </span>
      </div>

      <div className="px-6 pt-5">
        <Link
          href="/sender/shipments/new"
          className="flex min-h-16 items-center gap-3.5 rounded-[20px] bg-fill px-5 transition hover:bg-border/60"
        >
          <span className="size-3 rounded-full bg-primary" aria-hidden />
          <span className="text-[19px] font-extrabold text-ink-secondary">
            Nereye gönderiyorsun?
          </span>
        </Link>
      </div>

      <nav className="flex gap-5 px-6 pb-2 pt-4" aria-label="Hızlı işlemler">
        <Link href="/sender/shipments/new" className="flex flex-col items-center gap-2">
          <span className="flex size-15 items-center justify-center rounded-[20px] bg-navy text-ink-inverse">
            <PackageIcon size={26} />
          </span>
          <span className="text-xs font-extrabold text-ink">Paket</span>
        </Link>
        <Link href="/sender/shipments/new" className="flex flex-col items-center gap-2">
          <span className="flex size-15 items-center justify-center rounded-[20px] bg-fill text-ink">
            <DocumentIcon size={26} />
          </span>
          <span className="text-xs font-bold text-ink-secondary">Evrak</span>
        </Link>
        <Link href="/business" className="flex flex-col items-center gap-2">
          <span className="flex size-15 items-center justify-center rounded-[20px] bg-fill text-ink">
            <RepeatIcon size={24} />
          </span>
          <span className="text-xs font-bold text-ink-secondary">İşletme</span>
        </Link>
      </nav>

      <NearbyCouriersStrip />

      {loadError ? (
        <div className="px-6 pt-3">
          <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
            Gönderiler yüklenemedi. Sayfayı yenileyin.
          </p>
        </div>
      ) : null}

      {active ? (
        <div className="px-6 pt-3">
          <Link
            href={`/sender/shipments/${active.id}`}
            className="block rounded-[24px] bg-navy p-5 text-ink-inverse shadow-card transition hover:opacity-95"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-extrabold tracking-[0.08em] text-[#7FA8FF]">
                <span
                  className="size-2 rounded-full bg-success motion-safe:animate-blink"
                  aria-hidden
                />
                {["MATCHED", "PICKED_UP", "IN_TRANSIT"].includes(active.status)
                  ? "CANLI"
                  : "AKTİF"}{" "}
                · {active.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="text-xs font-extrabold text-white/50">Detay →</span>
            </div>
            <div className="flex items-end justify-between pt-3.5">
              <div>
                <p className="text-[13px] font-semibold text-white/55">
                  {active.status === "QUOTED"
                    ? "Ödeme bekliyor"
                    : active.status === "PAID"
                      ? "Kurye aranıyor"
                      : "Pencere sonu"}
                </p>
                <p className="tnum text-[44px] font-extrabold leading-none tracking-[-0.04em]">
                  {active.windowLabel ? active.windowLabel.split("– ").pop() : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-semibold text-white/55">{active.zoneName}</p>
                <p className="text-[15px] font-extrabold text-[#7FA8FF]">
                  {shipmentStatusMeta[active.status].label}
                </p>
              </div>
            </div>
            <div className="pt-3.5">
              <SegmentedProgress
                total={4}
                done={progressByStatus[active.status] ?? 0}
                label="Gönderi ilerlemesi"
              />
            </div>
          </Link>
        </div>
      ) : null}

      <div className="px-6 pt-6">
        <h2 className="pb-1 text-[13px] font-extrabold tracking-[0.06em] text-ink-faint">
          SON GÖNDERİLER
        </h2>
        {recent.length === 0 && !active ? (
          <div className="rounded-[24px] bg-fill-soft px-6 py-10 text-center">
            <p className="text-lg font-extrabold text-ink">İlk paketini gönder</p>
            <p className="pt-1 text-sm font-semibold text-ink-secondary">
              Bölgeni ve paket boyutunu seç, fiyatı anında gör.
            </p>
            <div className="pt-4">
              <Button href="/sender/shipments/new">Paket gönder</Button>
            </div>
          </div>
        ) : (
          <ul>
            {recent.map((s) => (
              <li key={s.id} className="border-b border-line last:border-0">
                <Link
                  href={`/sender/shipments/${s.id}`}
                  className="flex min-h-15 items-center gap-3.5 py-2"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-fill text-ink-secondary">
                    <PackageIcon size={18} />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-[15px] font-extrabold text-ink">{s.recipientName}</span>
                    <span className="text-xs font-semibold text-ink-faint">{s.dropoffAddress}</span>
                  </span>
                  <span className="text-[13px] font-extrabold text-primary">
                    {shipmentStatusMeta[s.status].label}
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
