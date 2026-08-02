"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PRESENCE_POLL_INTERVAL_MS, SERVICE_BOUNDS } from "@yolla/core";
import { createClient } from "@/lib/supabase/client";

type NearbyCourier = {
  id: string;
  lat: number;
  lng: number;
  vehicleType: string;
  activity: "AVAILABLE" | "ON_JOB" | "BUSY";
  freshness: "live" | "stale";
};

const vehicleLabel: Record<string, string> = {
  WALK: "Yaya",
  BIKE: "Bisiklet",
  MOTORCYCLE: "Motor",
  CAR: "Araç",
  TAXI: "Taksi",
};

async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Oturum gerekli");
  return { Authorization: `Bearer ${token}` };
}

/** Gönderici ana sayfa — müsait kurye arz sinyali (feed değil, kompakt şerit). */
export function NearbyCouriersStrip() {
  const [couriers, setCouriers] = useState<NearbyCourier[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams({
        south: String(SERVICE_BOUNDS.south),
        west: String(SERVICE_BOUNDS.west),
        north: String(SERVICE_BOUNDS.north),
        east: String(SERVICE_BOUNDS.east),
        activity: "AVAILABLE",
      });
      const res = await fetch(`/api/v1/couriers/nearby?${params}`, { headers });
      const json = (await res.json()) as {
        couriers?: NearbyCourier[];
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? null);
        return;
      }
      setError(null);
      setCouriers((json.couriers ?? []).slice(0, 5));
    } catch {
      setError(null);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), PRESENCE_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <section className="px-6 pt-6" aria-label="Yakındaki müsait kuryeler">
      <div className="flex items-baseline justify-between pb-2">
        <h2 className="text-[13px] font-extrabold tracking-[0.06em] text-ink-faint">
          YAKINDA MÜSAİT
        </h2>
        <Link href="/sender/map" className="text-[13px] font-extrabold text-primary">
          Haritada gör →
        </Link>
      </div>
      {error ? (
        <p className="text-xs font-bold text-ink-faint">Kurye ağı şu an görüntülenemiyor.</p>
      ) : couriers.length === 0 ? (
        <p className="rounded-2xl bg-fill-soft px-4 py-3 text-sm font-semibold text-ink-secondary">
          Şu an çevrimiçi müsait kurye yok. Yine de paket oluşturabilirsin — eşleşme ödeme
          sonrası açılır.
        </p>
      ) : (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {couriers.map((c) => (
            <li
              key={c.id}
              className="min-w-[7.5rem] shrink-0 rounded-[20px] bg-fill-soft px-4 py-3"
            >
              <p className="text-[11px] font-extrabold text-success-deep">● Müsait</p>
              <p className="pt-1 text-sm font-extrabold text-ink">
                {vehicleLabel[c.vehicleType] ?? c.vehicleType}
              </p>
              <p className="text-[11px] font-semibold text-ink-faint">
                {c.freshness === "live" ? "Canlı" : "Az önce"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
