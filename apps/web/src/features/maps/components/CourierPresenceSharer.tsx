"use client";

import { useEffect, useRef, useState } from "react";
import { shouldTransmitLocation } from "@yolla/core";
import { createClient } from "@/lib/supabase/client";

type Props = {
  /** false iken paylaşımı kapatır ve watch durdurur */
  enabled: boolean;
  onStatusChange?: (sharing: boolean) => void;
};

async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Oturum gerekli");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * İş ararken çevrimiçi varlık — opt-in GPS → POST /api/v1/driver/presence
 */
export function CourierPresenceSharer({ enabled, onStatusChange }: Props) {
  const watchId = useRef<number | null>(null);
  const sequence = useRef(0);
  const lastSent = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      void stopSharing();
      return;
    }
    void startSharing();
    return () => {
      // Watch durur; sunucu satırı açık kalır — stale (120s) ile düşer veya toggle kapatır.
      void stopSharing({ notifyServer: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  async function stopSharing(opts?: { notifyServer?: boolean }) {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (opts?.notifyServer !== false) {
      try {
        const headers = await authHeaders();
        await fetch("/api/v1/driver/presence", {
          method: "POST",
          headers,
          body: JSON.stringify({ sharingEnabled: false }),
        });
      } catch {
        /* ignore */
      }
    }
    onStatusChange?.(false);
  }

  async function startSharing() {
    if (!navigator.geolocation) {
      setError("Tarayıcınız konum paylaşımını desteklemiyor.");
      onStatusChange?.(false);
      return;
    }
    setError(null);

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        void (async () => {
          const next = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          const now = Date.now();
          const prev = lastSent.current;
          const decision = shouldTransmitLocation({
            previous: prev ? { lat: prev.lat, lng: prev.lng } : null,
            next,
            elapsedMs: prev ? now - prev.at : 999_999,
            speedMps: pos.coords.speed,
            accuracyMeters: pos.coords.accuracy,
          });
          // İlk nokta her zaman gönderilir (paylaşımı açmak için konum şart).
          if (!decision.transmit && prev) return;

          sequence.current += 1;
          try {
            const headers = await authHeaders();
            const res = await fetch("/api/v1/driver/presence", {
              method: "POST",
              headers,
              body: JSON.stringify({
                sharingEnabled: true,
                latitude: next.lat,
                longitude: next.lng,
                accuracyMeters: pos.coords.accuracy,
                heading: pos.coords.heading,
                sequenceNumber: sequence.current,
              }),
            });
            if (res.ok) {
              lastSent.current = { ...next, at: now };
              onStatusChange?.(true);
              setError(null);
            } else {
              const j = (await res.json()) as { error?: string };
              setError(j.error ?? "Varlık güncellenemedi.");
            }
          } catch {
            /* kısa ağ hataları */
          }
        })();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError("Konum izni kapalı. Ayarlardan izin verip tekrar dene.");
        } else {
          setError("Konum alınamadı.");
        }
        onStatusChange?.(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 15_000,
      },
    );
  }

  if (!error) return null;
  return <p className="text-sm font-bold text-danger">{error}</p>;
}
