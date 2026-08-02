"use client";

import { useEffect, useRef, useState } from "react";
import { shouldTransmitLocation } from "@yolla/core";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

type Props = {
  shipmentId: string;
  active: boolean;
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

export function CourierLocationSharer({ shipmentId, active }: Props) {
  const [status, setStatus] = useState<
    "idle" | "need_permission" | "sharing" | "denied" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const sequence = useRef(0);
  const lastSent = useRef<{ lat: number; lng: number; at: number } | null>(null);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, shipmentId]);

  function stop() {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (status === "sharing") setStatus("idle");
  }

  async function startSharing() {
    if (!navigator.geolocation) {
      setStatus("error");
      setMessage("Tarayıcınız konum paylaşımını desteklemiyor.");
      return;
    }
    setStatus("need_permission");
    setMessage(null);

    try {
      const headers = await authHeaders();
      const sessionRes = await fetch("/api/v1/driver/tracking-session", {
        method: "POST",
        headers,
        body: JSON.stringify({ shipmentId }),
      });
      if (!sessionRes.ok) {
        const j = (await sessionRes.json()) as { error?: string };
        setStatus("error");
        setMessage(j.error ?? "Takip oturumu açılamadı.");
        return;
      }
    } catch {
      setStatus("error");
      setMessage("Takip oturumu başlatılamadı.");
      return;
    }

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
          if (!decision.transmit) return;

          sequence.current += 1;
          try {
            const headers = await authHeaders();
            const res = await fetch("/api/v1/driver/location", {
              method: "POST",
              headers,
              body: JSON.stringify({
                jobId: shipmentId,
                latitude: next.lat,
                longitude: next.lng,
                accuracyMeters: pos.coords.accuracy,
                heading: pos.coords.heading,
                speedMetersPerSecond: pos.coords.speed,
                deviceTimestamp: new Date(pos.timestamp).toISOString(),
                sequenceNumber: sequence.current,
              }),
            });
            if (res.ok) {
              lastSent.current = { ...next, at: now };
              setStatus("sharing");
            }
          } catch {
            /* kısa süreli ağ hataları UI'yi bozmaz */
          }
        })();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setMessage(
            "Konum izni kapalı. Ayarlardan izin verip tekrar deneyin.",
          );
        } else {
          setStatus("error");
          setMessage("Konum alınamadı. Konum servislerini kontrol edin.");
        }
        stop();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 15_000,
      },
    );
    setStatus("sharing");
  }

  if (!active) return null;

  return (
    <div className="space-y-3 rounded-3xl border border-line bg-surface-elevated p-4">
      <div>
        <h3 className="text-base font-extrabold text-ink">Canlı konum</h3>
        <p className="mt-1 text-sm font-semibold text-ink-secondary">
          Konumun yalnızca aktif teslimat sırasında göndericiye ETA göstermek ve
          teslimat güvenliği için kullanılır.
        </p>
      </div>
      {status !== "sharing" ? (
        <Button type="button" size="lg" className="w-full" onClick={() => void startSharing()}>
          Konuma İzin Ver ve Paylaş
        </Button>
      ) : (
        <Button type="button" variant="soft" size="lg" className="w-full" onClick={stop}>
          Konum paylaşımını durdur
        </Button>
      )}
      {message ? <p className="text-sm font-bold text-danger">{message}</p> : null}
      {status === "sharing" ? (
        <p className="text-sm font-bold text-success-deep">Konum paylaşılıyor</p>
      ) : null}
    </div>
  );
}
