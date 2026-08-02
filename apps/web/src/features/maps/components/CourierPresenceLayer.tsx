"use client";

import { useCallback, useEffect, useState } from "react";
import { PRESENCE_POLL_INTERVAL_MS, SERVICE_BOUNDS } from "@yolla/core";
import { createClient } from "@/lib/supabase/client";
import type { PresenceMarker } from "./GoogleRouteMap";

export type PresenceFilters = {
  activities: Array<"AVAILABLE" | "ON_JOB" | "BUSY">;
  vehicleTypes: Array<"WALK" | "BIKE" | "MOTORCYCLE" | "CAR" | "TAXI">;
};

type Props = {
  filters: PresenceFilters;
  enabled?: boolean;
  onMarkers: (markers: PresenceMarker[]) => void;
  onError?: (message: string | null) => void;
};

async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Oturum gerekli");
  return { Authorization: `Bearer ${token}` };
}

/**
 * Gönderici/admin — nearby kuryeleri poll eder; marker’ları parent’a verir.
 */
export function CourierPresenceLayer({
  filters,
  enabled = true,
  onMarkers,
  onError,
}: Props) {
  const [tick, setTick] = useState(0);

  const fetchNearby = useCallback(async () => {
    if (!enabled) {
      onMarkers([]);
      return;
    }
    if (filters.activities.length === 0) {
      onMarkers([]);
      onError?.(null);
      return;
    }
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams({
        south: String(SERVICE_BOUNDS.south),
        west: String(SERVICE_BOUNDS.west),
        north: String(SERVICE_BOUNDS.north),
        east: String(SERVICE_BOUNDS.east),
        activity: filters.activities.join(","),
      });
      if (filters.vehicleTypes.length > 0) {
        params.set("vehicleType", filters.vehicleTypes.join(","));
      }
      const res = await fetch(`/api/v1/couriers/nearby?${params}`, { headers });
      const json = (await res.json()) as {
        couriers?: PresenceMarker[];
        error?: string;
      };
      if (!res.ok) {
        onError?.(json.error ?? "Kuryeler yüklenemedi.");
        return;
      }
      onError?.(null);
      onMarkers(
        (json.couriers ?? []).map((c) => ({
          id: c.id,
          lat: c.lat,
          lng: c.lng,
          activity: c.activity,
          vehicleType: c.vehicleType,
        })),
      );
    } catch {
      onError?.("Kurye haritasına bağlanılamadı.");
    }
  }, [enabled, filters, onMarkers, onError]);

  useEffect(() => {
    void fetchNearby();
  }, [fetchNearby, tick]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(
      () => setTick((t) => t + 1),
      PRESENCE_POLL_INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, [enabled]);

  return null;
}

export const DEFAULT_PRESENCE_FILTERS: PresenceFilters = {
  activities: ["AVAILABLE", "ON_JOB"],
  vehicleTypes: [],
};
