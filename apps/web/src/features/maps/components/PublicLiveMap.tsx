"use client";

import { GoogleRouteMap } from "./GoogleRouteMap";

type Props = {
  pickup: { lat: number; lng: number } | null;
  dropoff: { lat: number; lng: number } | null;
  live: {
    lat: number;
    lng: number;
    freshness: "live" | "stale" | "offline";
  } | null;
  routePolyline: string | null;
  liveLocationAvailable: boolean;
};

export function PublicLiveMap({
  pickup,
  dropoff,
  live,
  routePolyline,
  liveLocationAvailable,
}: Props) {
  const freshnessLabel =
    live?.freshness === "live"
      ? "Canlı konum"
      : live?.freshness === "stale"
        ? "Konum kısa süre önce güncellendi."
        : live
          ? "Sürücünün bağlantısı geçici olarak kesildi. Son konumu gösteriyoruz."
          : liveLocationAvailable
            ? "Konum bekleniyor…"
            : "Canlı harita takibi bu aşamada aktif değil.";

  const badgeTone =
    live?.freshness === "live"
      ? "bg-success text-ink-inverse"
      : live?.freshness === "stale"
        ? "bg-warning-soft text-warning-deep"
        : "bg-fill text-ink-secondary";

  return (
    <div className="relative overflow-hidden rounded-3xl">
      <GoogleRouteMap
        className="h-64 w-full sm:h-72"
        showControls={false}
        pickup={pickup}
        dropoff={dropoff}
        courier={live ? { lat: live.lat, lng: live.lng } : null}
        encodedPolyline={routePolyline}
      />
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-between gap-2">
        <span
          className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold shadow-float ${badgeTone}`}
          aria-live="polite"
        >
          {live?.freshness === "live" ? "● Canlı" : freshnessLabel}
        </span>
      </div>
      {live?.freshness !== "live" ? (
        <p className="sr-only">{freshnessLabel}</p>
      ) : null}
    </div>
  );
}
