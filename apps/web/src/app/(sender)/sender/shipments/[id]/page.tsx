import Link from "next/link";
import { notFound } from "next/navigation";
import { formatTry, type ShipmentStatus } from "@yolla/core";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { queryShipmentDetail, type ShipmentDetail } from "@/features/shipments/queries";
import { PayButton } from "@/features/shipments/components/PayButton";
import { CancelShipmentButton } from "@/features/shipments/components/CancelShipmentButton";
import { ShareTrackingButton } from "@/features/tracking/components/ShareTrackingButton";
import { Button } from "@/components/ui/Button";
import { MapCanvas } from "@/components/ui/MapCanvas";
import { SegmentedProgress } from "@/components/ui/SegmentedProgress";
import { ShipmentStatusBadge, shipmentStatusMeta } from "@/components/ui/StatusBadge";
import { Timeline, type TimelineItem } from "@/components/ui/Timeline";
import { TopBar } from "@/components/ui/TopBar";
import { CheckIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const FLOW: ShipmentStatus[] = ["PAID", "MATCHED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"];

const flowTitles: Record<string, string> = {
  PAID: "Ödeme alındı — kurye aranıyor",
  MATCHED: "Kurye atandı",
  PICKED_UP: "Paket teslim alındı",
  IN_TRANSIT: "Paket yolda",
  DELIVERED: "Teslim edildi",
};

function buildTimeline(detail: ShipmentDetail): TimelineItem[] {
  const eventByStatus = new Map(detail.events.map((e) => [e.toStatus, e]));
  const failed = ["FAILED_DELIVERY", "RETURNED", "CANCELLED"].includes(detail.status);
  const currentIndex = FLOW.indexOf(detail.status as (typeof FLOW)[number]);

  const items: TimelineItem[] = FLOW.map((status, i) => {
    const event = eventByStatus.get(status);
    const state: TimelineItem["state"] = event
      ? status === detail.status && status !== "DELIVERED"
        ? "active"
        : "done"
      : !failed && currentIndex >= 0 && i > currentIndex
        ? "todo"
        : "todo";
    return {
      key: status,
      title: flowTitles[status] ?? shipmentStatusMeta[status].label,
      time: event?.timeLabel,
      state,
    };
  });

  if (failed) {
    const terminal = detail.events[detail.events.length - 1];
    items.push({
      key: detail.status,
      title: shipmentStatusMeta[detail.status].label,
      time: terminal?.timeLabel,
      state: "failed",
    });
  }
  return items;
}

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 pb-32">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Gönderi</h1>
        <p className="font-semibold text-ink-secondary">Detayı görmek için giriş yap.</p>
        <Button href={`/login?next=/sender/shipments/${id}`} size="lg" className="w-full">
          Giriş yap
        </Button>
      </main>
    );
  }

  if (!z.string().uuid().safeParse(id).success) {
    notFound();
  }

  const detail = await queryShipmentDetail(id);
  if (!detail) {
    notFound();
  }

  const code = detail.id.slice(0, 8).toUpperCase();
  const live = ["MATCHED", "PICKED_UP", "IN_TRANSIT"].includes(detail.status);
  const routeProgress =
    detail.status === "MATCHED" ? 0.15 : detail.status === "PICKED_UP" ? 0.4 : 0.7;

  // QUOTED — ödeme ekranı
  if (detail.status === "QUOTED") {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col pb-32">
        <TopBar backHref="/sender/shipments" title="Ödeme" />
        <div className="flex-1 space-y-5 px-6 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-ink-faint">{code}</span>
            <ShipmentStatusBadge status={detail.status} />
          </div>
          <RouteBlock detail={detail} />
          {detail.quote ? (
            <div className="space-y-2 border-t border-line pt-4">
              <PriceLine label={`Bölge tabanı (${detail.zoneName})`} value={formatTry(detail.quote.zoneBaseMinor)} />
              <PriceLine label={`Boyut (${detail.sizeName})`} value="çarpan dahil" muted />
              {detail.quote.expressPremiumMinor > 0 ? (
                <PriceLine label="Yolla Ekspres primi" value={formatTry(detail.quote.expressPremiumMinor)} />
              ) : null}
              <div className="flex items-baseline justify-between pt-2">
                <span className="text-sm font-bold text-ink-secondary">Toplam</span>
                <span className="tnum text-[32px] font-extrabold tracking-[-0.03em] text-ink">
                  {detail.amountLabel}
                </span>
              </div>
            </div>
          ) : null}
        </div>
        <div className="space-y-3 border-t border-line px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-4">
          <PayButton shipmentId={detail.id} />
          <CancelShipmentButton shipmentId={detail.id} />
        </div>
      </main>
    );
  }

  // PAID — kurye aranıyor (radar)
  if (detail.status === "PAID") {
    return (
      <main className="relative mx-auto flex min-h-screen max-w-lg flex-col">
        <MapCanvas variant="radar" className="absolute inset-0" />
        <TopBar floating backHref="/sender/shipments" />
        <div className="relative mt-auto">
          <div className="rounded-t-[32px] bg-surface-elevated px-6 pb-[max(7rem,env(safe-area-inset-bottom))] pt-3 shadow-sheet">
            <span className="mx-auto mb-4 block h-1.5 w-11 rounded-full bg-border" aria-hidden />
            <div className="space-y-4">
              <div>
                <h1 className="text-[26px] font-extrabold tracking-[-0.025em] text-ink">
                  Kurye aranıyor
                  <span className="motion-safe:animate-blink">…</span>
                </h1>
                <p className="text-sm font-semibold text-ink-secondary">
                  Gönderin bölgedeki onaylı kuryelere açıldı.
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-fill" aria-hidden>
                <span className="block h-full w-1/2 rounded-full bg-gradient-to-r from-primary to-[#4d8dff] motion-safe:animate-pulse" />
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-fill-soft px-4.5 py-3.5">
                <span className="text-sm font-bold text-ink-secondary">
                  {detail.sizeName}
                  {detail.isExpress ? " · Ekspres" : " · Standart"}
                </span>
                <span className="tnum text-base font-extrabold text-ink">
                  {detail.amountLabel ?? "—"}
                </span>
              </div>
              <CancelShipmentButton shipmentId={detail.id} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // MATCHED / PICKED_UP / IN_TRANSIT — takip
  if (live) {
    return (
      <main className="relative mx-auto flex min-h-screen max-w-lg flex-col">
        <MapCanvas
          variant="progress"
          progress={routeProgress}
          className="absolute inset-0"
        />
        <TopBar
          floating
          backHref="/sender/shipments"
          right={
            <span className="flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-[13px] font-extrabold text-ink-inverse shadow-float">
              <span className="size-2 rounded-full bg-success motion-safe:animate-blink" aria-hidden />
              CANLI
            </span>
          }
        />
        <div className="relative mt-auto">
          <div className="rounded-t-[32px] bg-surface-elevated px-6 pb-[max(7rem,env(safe-area-inset-bottom))] pt-3 shadow-sheet">
            <span className="mx-auto mb-4 block h-1.5 w-11 rounded-full bg-border" aria-hidden />
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm font-bold text-ink-secondary">
                    {shipmentStatusMeta[detail.status].label} · pencere sonu
                  </p>
                  <p className="tnum text-[52px] font-extrabold leading-none tracking-[-0.045em] text-ink">
                    {detail.window?.endTimeLabel ?? "—"}
                  </p>
                </div>
                <ShipmentStatusBadge status={detail.status} />
              </div>
              <SegmentedProgress
                total={4}
                done={detail.status === "MATCHED" ? 1 : detail.status === "PICKED_UP" ? 2 : 3}
                label="Teslimat ilerlemesi"
              />
              <div className="border-t border-line pt-4">
                <Timeline items={buildTimeline(detail)} />
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-line pt-3.5 text-sm">
                <ShareTrackingButton shipmentId={detail.id} />
                <Link href="/sender/shipments" className="pt-2 font-bold text-ink-faint">
                  Tüm gönderiler
                </Link>
              </div>
              {detail.status === "MATCHED" ? (
                <CancelShipmentButton shipmentId={detail.id} label="Gönderiyi iptal et" />
              ) : null}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // DELIVERED — teslim ekranı
  if (detail.status === "DELIVERED") {
    const deliveredEvent = detail.events.find((e) => e.toStatus === "DELIVERED");
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col pb-32">
        <div className="bg-navy px-6 pb-6 pt-[max(4.5rem,env(safe-area-inset-top))] text-ink-inverse">
          <p className="flex items-center gap-2.5 text-[13px] font-extrabold tracking-[0.06em] text-[#4ADE80]">
            <CheckIcon size={18} strokeWidth={3} /> TESLİM EDİLDİ
          </p>
          <h1 className="pt-2 text-[40px] font-extrabold leading-[1.1] tracking-[-0.035em]">
            Paketin ulaştı
          </h1>
          <p className="pt-2 text-sm font-semibold text-white/60">
            {code}
            {deliveredEvent ? ` · ${deliveredEvent.timeLabel}` : ""} · Alıcı:{" "}
            <strong className="text-ink-inverse">{detail.recipientName}</strong>
          </p>
        </div>
        <div className="flex-1 space-y-5 px-6 pt-5">
          <div className="flex flex-wrap gap-3">
            <Button href="/sender/shipments/new" variant="dark" size="sm">
              Tekrar gönder
            </Button>
            <Button href="/sender/shipments" variant="soft" size="sm">
              Gönderilerim
            </Button>
          </div>
          <div className="border-t border-line pt-4">
            <Timeline items={buildTimeline(detail)} />
          </div>
          <p className="rounded-2xl bg-fill-soft px-4 py-3 text-sm font-semibold text-ink-secondary">
            Kurye değerlendirme ve bahşiş yakında — teslimat kaydın güvende.
          </p>
        </div>
      </main>
    );
  }

  // CANCELLED / FAILED_DELIVERY / RETURNED / DRAFT
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col pb-32">
      <TopBar backHref="/sender/shipments" title="Gönderi" />
      <div className="flex-1 space-y-5 px-6 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-ink-faint">{code}</span>
          <ShipmentStatusBadge status={detail.status} />
        </div>
        {detail.status === "FAILED_DELIVERY" || detail.status === "RETURNED" ? (
          <div className="rounded-[24px] bg-danger-soft px-5 py-4">
            <p className="text-base font-extrabold text-ink">Teslimat tamamlanamadı</p>
            <p className="pt-1 text-sm font-semibold text-ink-secondary">
              Destek ekibi süreçle ilgileniyor. Paket iade sürecine alındıysa durumu buradan
              izleyebilirsin.
            </p>
          </div>
        ) : null}
        <RouteBlock detail={detail} />
        <div className="border-t border-line pt-4">
          <Timeline items={buildTimeline(detail)} />
        </div>
        <Button href="/sender/shipments/new" variant="dark" className="w-full">
          Yeni gönderi oluştur
        </Button>
      </div>
    </main>
  );
}

function RouteBlock({ detail }: { detail: ShipmentDetail }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center py-2" aria-hidden>
        <span className="size-3 rounded-full bg-navy" />
        <span className="my-1.5 w-0.5 flex-1 bg-border" />
        <span className="size-3 rounded-[3px] bg-primary" />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="min-h-14 border-b border-line pb-2">
          <p className="text-[11px] font-extrabold tracking-[0.06em] text-ink-faint">ALIM</p>
          <p className="text-base font-extrabold text-ink">{detail.pickupAddress}</p>
        </div>
        <div className="min-h-14 pt-2">
          <p className="text-[11px] font-extrabold tracking-[0.06em] text-primary">TESLİM</p>
          <p className="text-base font-extrabold text-ink">{detail.dropoffAddress}</p>
          <p className="text-xs font-semibold text-ink-faint">
            {detail.recipientName}
            {detail.window ? ` · ${detail.window.label}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function PriceLine({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="font-semibold text-ink-secondary">{label}</span>
      <span className={`tnum font-extrabold ${muted ? "text-ink-faint" : "text-ink"}`}>{value}</span>
    </div>
  );
}
