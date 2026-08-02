import { headers } from "next/headers";
import { lookupByTrackingToken } from "@/features/tracking/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { ShipmentStatusBadge, shipmentStatusMeta } from "@/components/ui/StatusBadge";
import { Timeline, type TimelineItem } from "@/components/ui/Timeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { MapPinIcon, PackageIcon } from "@/components/ui/icons";
import { PublicLiveMap } from "@/features/maps/components/PublicLiveMap";

export const dynamic = "force-dynamic";

const failureCopy = {
  not_found: {
    title: "Takip linki geçersiz",
    description: "Bu bağlantı hatalı olabilir. Gönderi sahibinden yeni link isteyin.",
  },
  expired: {
    title: "Takip linkinin süresi doldu",
    description: "Güvenlik için takip linkleri belirli süre sonra kapanır.",
  },
  revoked: {
    title: "Takip linki kapatıldı",
    description: "Gönderi sahibi bu bağlantıyı iptal etti.",
  },
} as const;

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Auth'suz uç nokta — tarama saldırısına karşı IP bazlı hız sınırı (CLAUDE.md §6.7).
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";
  const limit = await checkRateLimit("tracking", ip);

  if (!limit.allowed) {
    return (
      <Shell>
        <EmptyState
          title="Çok fazla deneme"
          description={`Lütfen ${limit.retryAfterSeconds} saniye sonra tekrar deneyin.`}
        />
      </Shell>
    );
  }

  const result = await lookupByTrackingToken(token);

  if (!result.ok) {
    const copy = failureCopy[result.reason];
    return (
      <Shell>
        <EmptyState
          icon={<PackageIcon size={26} />}
          title={copy.title}
          description={copy.description}
          action={<Button href="/">YOLLA ana sayfa</Button>}
        />
      </Shell>
    );
  }

  const view = result.view;
  const isFinished = ["DELIVERED", "CANCELLED", "RETURNED"].includes(view.status);

  const items: TimelineItem[] = view.events.map((e, i) => ({
    key: `${e.toStatus}-${i}`,
    title: shipmentStatusMeta[e.toStatus].label,
    time: e.timeLabel,
    state: i === view.events.length - 1 && !isFinished ? "active" : "done",
  }));

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.08em] text-ink-faint">
              GÖNDERİ {view.code}
            </p>
            <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-ink">
              {shipmentStatusMeta[view.status].label}
            </h1>
          </div>
          <ShipmentStatusBadge status={view.status} />
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col items-center py-2" aria-hidden>
            <span className="size-3 rounded-full bg-navy" />
            <span className="my-1.5 w-0.5 flex-1 bg-border" />
            <span className="size-3 rounded-[3px] bg-primary" />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <div>
              <p className="text-[11px] font-extrabold tracking-[0.06em] text-ink-faint">
                ALIM BÖLGESİ
              </p>
              <p className="text-base font-extrabold text-ink">{view.pickupArea}</p>
            </div>
            <div>
              <p className="text-[11px] font-extrabold tracking-[0.06em] text-primary">
                TESLİMAT BÖLGESİ
              </p>
              <p className="text-base font-extrabold text-ink">{view.dropoffArea}</p>
              <p className="text-xs font-semibold text-ink-faint">
                Alıcı: {view.recipientName}
              </p>
            </div>
          </div>
        </div>

        <PublicLiveMap
          pickup={view.pickup}
          dropoff={view.dropoff}
          live={view.live}
          routePolyline={view.routePolyline}
          liveLocationAvailable={view.liveLocationAvailable}
        />

        <div className="grid grid-cols-2 gap-2">
          {view.sizeLabel ? (
            <div className="rounded-2xl bg-fill-soft px-3 py-3">
              <p className="text-[10px] font-extrabold tracking-wide text-ink-faint">BOYUT</p>
              <p className="text-sm font-extrabold text-ink">{view.sizeLabel}</p>
            </div>
          ) : null}
          {view.itemDescription ? (
            <div className="rounded-2xl bg-fill-soft px-3 py-3">
              <p className="text-[10px] font-extrabold tracking-wide text-ink-faint">MAL</p>
              <p className="truncate text-sm font-extrabold text-ink">
                {view.itemDescription}
                {view.itemColor ? ` · ${view.itemColor}` : ""}
              </p>
            </div>
          ) : null}
          {view.courierDisplayName ? (
            <div className="col-span-2 rounded-2xl bg-fill-soft px-3 py-3">
              <p className="text-[10px] font-extrabold tracking-wide text-ink-faint">KURYE</p>
              <p className="text-sm font-extrabold text-ink">
                {view.courierDisplayName}
                {view.courierRatingAvg != null
                  ? ` · ★ ${view.courierRatingAvg.toFixed(1)}`
                  : ""}
              </p>
            </div>
          ) : null}
        </div>

        {view.windowLabel ? (
          <div className="rounded-2xl bg-fill-soft px-4 py-3">
            <p className="text-xs font-bold text-ink-secondary">Teslimat penceresi</p>
            <p className="text-[15px] font-extrabold text-ink">{view.windowLabel}</p>
          </div>
        ) : null}

        {!view.liveLocationAvailable ? (
          <div className="flex items-start gap-3 rounded-2xl bg-info-soft px-4 py-3">
            <MapPinIcon size={18} className="mt-0.5 shrink-0 text-info" />
            <p className="text-sm font-semibold text-ink-secondary">
              Canlı konum bu aşamada henüz paylaşılmıyor. Durum geçmişi aşağıda.
            </p>
          </div>
        ) : null}

        <div className="border-t border-line pt-4">
          <h2 className="pb-3 text-[13px] font-extrabold tracking-[0.06em] text-ink-faint">
            DURUM GEÇMİŞİ
          </h2>
          <Timeline items={items} />
        </div>

        <p className="text-xs font-semibold text-ink-faint">
          Son güncelleme: {view.lastUpdatedLabel} · Gizlilik için alıcı bilgileri kısıtlı
          gösterilir.
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-surface-elevated">
      <div className="mx-auto max-w-lg px-6 py-[max(3rem,env(safe-area-inset-top))]">
        <p className="pb-6 text-sm font-extrabold tracking-widest text-primary">YOLLA</p>
        {children}
      </div>
    </main>
  );
}
