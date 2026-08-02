"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { SheetPanel } from "@/components/ui/Sheet";
import { MapPinIcon, NavigationIcon } from "@/components/ui/icons";
import { GoogleRouteMap, type MapLatLng, type PresenceMarker } from "./GoogleRouteMap";
import { AddressAutocomplete, type SelectedPlace } from "./AddressAutocomplete";
import {
  CourierPresenceLayer,
  DEFAULT_PRESENCE_FILTERS,
  type PresenceFilters,
} from "./CourierPresenceLayer";
import { resolveCoordsToPlace } from "../reverse-geocode-client";

type RouteInfo = {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
};

type Mode = "pickup" | "dropoff";

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function formatDuration(s: number): string {
  const min = Math.round(s / 60);
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  return `${h} sa ${min % 60} dk`;
}

async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Oturum gerekli");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

/**
 * Gönderici harita — Uber / Bolt / Wolt tarzı immersive yüzey:
 * full-bleed harita, üstte A→B floating arama, sağ FAB'lar, alt sheet + ETA.
 */
export function InteractiveMapPicker() {
  const [mode, setMode] = useState<Mode>("pickup");
  const [pickupText, setPickupText] = useState("");
  const [dropoffText, setDropoffText] = useState("");
  const [pickup, setPickup] = useState<(SelectedPlace & MapLatLng) | null>(null);
  const [dropoff, setDropoff] = useState<(SelectedPlace & MapLatLng) | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presenceError, setPresenceError] = useState<string | null>(null);
  const [presenceMarkers, setPresenceMarkers] = useState<PresenceMarker[]>([]);
  const [showCouriers, setShowCouriers] = useState(true);
  const [filters, setFilters] = useState<PresenceFilters>(DEFAULT_PRESENCE_FILTERS);
  const [pending, startTransition] = useTransition();
  const routeKeyRef = useRef<string | null>(null);
  const mapControls = useRef<{ fitAll: () => void; goMyLocation: () => void } | null>(null);

  const onPresenceMarkers = useCallback((markers: PresenceMarker[]) => {
    setPresenceMarkers(markers);
  }, []);

  function toggleActivity(activity: PresenceFilters["activities"][number]) {
    setFilters((prev) => {
      const has = prev.activities.includes(activity);
      const activities = has
        ? prev.activities.filter((a) => a !== activity)
        : [...prev.activities, activity];
      return { ...prev, activities };
    });
  }

  function toggleVehicle(vehicle: PresenceFilters["vehicleTypes"][number]) {
    setFilters((prev) => {
      const has = prev.vehicleTypes.includes(vehicle);
      const vehicleTypes = has
        ? prev.vehicleTypes.filter((v) => v !== vehicle)
        : [...prev.vehicleTypes, vehicle];
      return { ...prev, vehicleTypes };
    });
  }

  const pickupGeocodeSeq = useRef(0);
  const dropoffGeocodeSeq = useRef(0);

  const onPickupChange = useCallback((coords: MapLatLng) => {
    const seq = ++pickupGeocodeSeq.current;
    setPickup({
      placeId: `map:${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`,
      formattedAddress: "Adres bulunuyor…",
      ...coords,
    });
    setPickupText("Adres bulunuyor…");
    setRoute(null);
    routeKeyRef.current = null;
    void resolveCoordsToPlace(coords).then((place) => {
      if (seq !== pickupGeocodeSeq.current) return;
      setPickup(place);
      setPickupText(place.formattedAddress);
    });
  }, []);

  const onDropoffChange = useCallback((coords: MapLatLng) => {
    const seq = ++dropoffGeocodeSeq.current;
    setDropoff({
      placeId: `map:${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`,
      formattedAddress: "Adres bulunuyor…",
      ...coords,
    });
    setDropoffText("Adres bulunuyor…");
    setRoute(null);
    routeKeyRef.current = null;
    void resolveCoordsToPlace(coords).then((place) => {
      if (seq !== dropoffGeocodeSeq.current) return;
      setDropoff(place);
      setDropoffText(place.formattedAddress);
    });
  }, []);

  const computeRoute = useCallback(
    (origin: SelectedPlace & MapLatLng, destination: SelectedPlace & MapLatLng) => {
      const key = `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}>${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
      if (routeKeyRef.current === key) return;
      routeKeyRef.current = key;
      setError(null);
      startTransition(async () => {
        try {
          const headers = await authHeaders();
          const res = await fetch("/api/v1/maps/route", {
            method: "POST",
            headers,
            body: JSON.stringify({
              origin: { lat: origin.lat, lng: origin.lng },
              destination: { lat: destination.lat, lng: destination.lng },
            }),
          });
          const json = (await res.json()) as {
            route?: {
              distanceMeters: number;
              durationSeconds: number;
              encodedPolyline: string;
            };
            error?: string;
          };
          if (!res.ok || !json.route) {
            setError(json.error ?? "Rota hesaplanamadı.");
            routeKeyRef.current = null;
            return;
          }
          setRoute({
            distanceMeters: json.route.distanceMeters,
            durationSeconds: json.route.durationSeconds,
            encodedPolyline: json.route.encodedPolyline,
          });
        } catch {
          setError("Rota servisine bağlanılamadı. Giriş yaptığından emin ol.");
          routeKeyRef.current = null;
        }
      });
    },
    [],
  );

  // Her iki pin hazırsa otomatik rota (Bolt / Uber davranışı)
  useEffect(() => {
    if (pickup && dropoff) {
      computeRoute(pickup, dropoff);
    } else {
      routeKeyRef.current = null;
      setRoute(null);
    }
  }, [pickup, dropoff, computeRoute]);

  const stepHint =
    mode === "pickup"
      ? pickup
        ? "Alım pinini sürükleyebilir veya teslimata geçebilirsin"
        : "Alım noktasını ara veya haritaya dokun"
      : dropoff
        ? "Teslimat pinini sürükle — rota otomatik çizilir"
        : "Teslimat noktasını ara veya haritaya dokun";

  const bothReady = Boolean(pickup && dropoff);

  return (
    <div className="relative h-[min(100dvh,920px)] w-full overflow-hidden bg-fill">
      {/* Full-bleed harita — tek görsel yüzey */}
      <GoogleRouteMap
        className="absolute inset-0 h-full w-full"
        interactive
        edgeToEdge
        showControls={false}
        activePin={mode}
        pickup={pickup}
        dropoff={dropoff}
        presenceMarkers={showCouriers ? presenceMarkers : []}
        encodedPolyline={route?.encodedPolyline}
        onPickupChange={onPickupChange}
        onDropoffChange={onDropoffChange}
        controlRef={mapControls}
        fitPadding={{ top: 200, right: 40, bottom: 320, left: 40 }}
      />

      <CourierPresenceLayer
        enabled={showCouriers}
        filters={filters}
        onMarkers={onPresenceMarkers}
        onError={setPresenceError}
      />

      {/* Sağ FAB'lar — sheet üstünde (Uber / Bolt) */}
      <div className="pointer-events-none absolute right-3 bottom-[min(42vh,22rem)] z-20 flex flex-col gap-2 sm:bottom-[20rem]">
        <button
          type="button"
          aria-label="Konumuma git"
          onClick={() => mapControls.current?.goMyLocation()}
          className="pointer-events-auto flex size-12 items-center justify-center rounded-full bg-surface-elevated text-navy shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <NavigationIcon size={20} />
        </button>
        <button
          type="button"
          aria-label="Tüm noktaları sığdır"
          onClick={() => mapControls.current?.fitAll()}
          className="pointer-events-auto flex size-12 items-center justify-center rounded-full bg-surface-elevated text-navy shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <MapPinIcon size={20} />
        </button>
      </div>

      {/* Üst: A→B floating arama kartı (Uber / Wolt) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto mx-auto mb-2 flex max-w-lg flex-wrap gap-1.5">
          <FilterChip
            active={showCouriers}
            onClick={() => setShowCouriers((v) => !v)}
            label="Kuryeler"
          />
          <FilterChip
            active={filters.activities.includes("AVAILABLE")}
            onClick={() => toggleActivity("AVAILABLE")}
            label="Müsait"
            tone="success"
          />
          <FilterChip
            active={filters.activities.includes("ON_JOB")}
            onClick={() => toggleActivity("ON_JOB")}
            label="Teslimatta"
            tone="warn"
          />
          <FilterChip
            active={filters.activities.includes("BUSY")}
            onClick={() => toggleActivity("BUSY")}
            label="Meşgul"
          />
          <FilterChip
            active={filters.vehicleTypes.includes("BIKE")}
            onClick={() => toggleVehicle("BIKE")}
            label="Bisiklet"
          />
          <FilterChip
            active={filters.vehicleTypes.includes("MOTORCYCLE")}
            onClick={() => toggleVehicle("MOTORCYCLE")}
            label="Motor"
          />
          <FilterChip
            active={filters.vehicleTypes.includes("CAR")}
            onClick={() => toggleVehicle("CAR")}
            label="Araç"
          />
          <FilterChip
            active={filters.vehicleTypes.includes("TAXI")}
            onClick={() => toggleVehicle("TAXI")}
            label="Taksi"
          />
        </div>
        {presenceError ? (
          <p className="pointer-events-none mx-auto mb-2 max-w-lg rounded-2xl bg-danger-soft px-3 py-2 text-xs font-bold text-danger">
            {presenceError}
          </p>
        ) : null}
        <div className="pointer-events-auto mx-auto max-w-lg rounded-[22px] bg-surface-elevated/95 p-3 shadow-float backdrop-blur-md">
          <div className="flex gap-3">
            {/* Timeline dots */}
            <div className="flex w-4 shrink-0 flex-col items-center pt-3 pb-2" aria-hidden>
              <span
                className={`size-2.5 rounded-full ring-2 ring-offset-2 ring-offset-surface-elevated ${
                  mode === "pickup"
                    ? "bg-danger ring-danger"
                    : "bg-danger/40 ring-transparent"
                }`}
              />
              <span className="my-1 w-px flex-1 bg-border" />
              <span
                className={`size-2.5 rounded-full ring-2 ring-offset-2 ring-offset-surface-elevated ${
                  mode === "dropoff"
                    ? "bg-[#2563EB] ring-[#2563EB]"
                    : "bg-[#2563EB]/40 ring-transparent"
                }`}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div
                role="group"
                aria-label="Alım adresi"
                onClick={() => setMode("pickup")}
                className={`w-full rounded-xl px-2 py-1 text-left transition ${
                  mode === "pickup" ? "bg-fill-soft" : ""
                }`}
              >
                <p className="text-[10px] font-extrabold tracking-wide text-danger">ALIM</p>
                <AddressAutocomplete
                  compact
                  hideHint
                  label="Alım adresi"
                  value={pickupText}
                  placeholder="Nereden alalım?"
                  onFocus={() => setMode("pickup")}
                  onTextChange={(v) => {
                    setMode("pickup");
                    setPickupText(v);
                    setPickup(null);
                    setRoute(null);
                    routeKeyRef.current = null;
                  }}
                  onPlaceSelected={(place) => {
                    setPickupText(place.formattedAddress);
                    setPickup(place);
                    setMode("dropoff");
                  }}
                />
              </div>

              <div className="mx-2 border-t border-border/80" />

              <div
                role="group"
                aria-label="Teslimat adresi"
                onClick={() => setMode("dropoff")}
                className={`w-full rounded-xl px-2 py-1 text-left transition ${
                  mode === "dropoff" ? "bg-primary-soft/50" : ""
                }`}
              >
                <p className="text-[10px] font-extrabold tracking-wide text-[#2563EB]">
                  TESLİMAT
                </p>
                <AddressAutocomplete
                  compact
                  hideHint
                  label="Teslimat adresi"
                  value={dropoffText}
                  placeholder="Nereye gidecek?"
                  onFocus={() => setMode("dropoff")}
                  onTextChange={(v) => {
                    setMode("dropoff");
                    setDropoffText(v);
                    setDropoff(null);
                    setRoute(null);
                    routeKeyRef.current = null;
                  }}
                  onPlaceSelected={(place) => {
                    setDropoffText(place.formattedAddress);
                    setDropoff(place);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alt sheet — tek birincil aksiyon + ETA bloğu */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
        <div className="pointer-events-auto mx-auto max-w-lg">
          <SheetPanel className="pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] shadow-sheet">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold tracking-tight text-ink">
                    {mode === "pickup" ? "Alım noktası" : "Teslimat noktası"}
                  </h2>
                  <p className="mt-0.5 text-sm font-semibold text-ink-secondary">{stepHint}</p>
                </div>
                {pending ? (
                  <span className="shrink-0 rounded-full bg-fill px-3 py-1 text-[11px] font-extrabold text-ink-secondary">
                    Rota…
                  </span>
                ) : null}
              </div>

              {route ? (
                <div
                  className="flex items-center justify-between rounded-2xl bg-navy px-4 py-3.5 text-white"
                  aria-live="polite"
                >
                  <div>
                    <p className="text-[10px] font-extrabold tracking-wide text-white/60">
                      TAHMİNİ SÜRE
                    </p>
                    <p className="text-xl font-extrabold tracking-tight">
                      ~{formatDuration(route.durationSeconds)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-extrabold tracking-wide text-white/60">MESAFE</p>
                    <p className="text-lg font-extrabold">
                      {formatDistance(route.distanceMeters)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-fill-soft px-4 py-3 text-sm font-semibold text-ink-secondary">
                  {bothReady
                    ? "Rota hesaplanıyor…"
                    : "İki noktayı seçince rota ve süre burada görünür."}
                </div>
              )}

              {error ? (
                <p
                  role="alert"
                  className="rounded-2xl bg-danger-soft px-3 py-2 text-sm font-bold text-danger"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-2.5">
                {!bothReady ? (
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      if (mode === "pickup" && pickup) setMode("dropoff");
                      else if (mode === "dropoff" && !pickup) setMode("pickup");
                      else mapControls.current?.goMyLocation();
                    }}
                  >
                    {mode === "pickup" && !pickup
                      ? "Konumumu alım yap"
                      : mode === "pickup" && pickup
                        ? "Teslimata geç"
                        : "Konumumu teslimat yap"}
                  </Button>
                ) : (
                  <Button
                    href="/sender/shipments/new"
                    size="lg"
                    className="w-full"
                    variant="primary"
                  >
                    Bu noktalarla gönderi oluştur
                  </Button>
                )}

                {mode === "pickup" && pickup && !dropoff ? (
                  <Button
                    type="button"
                    variant="soft"
                    className="w-full"
                    onClick={() => setMode("dropoff")}
                  >
                    Teslimat noktasını seç
                  </Button>
                ) : null}
              </div>
            </div>
          </SheetPanel>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  tone,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "success" | "warn";
}) {
  const activeTone =
    tone === "success"
      ? "bg-success text-ink-inverse"
      : tone === "warn"
        ? "bg-[#FF8A00] text-ink-inverse"
        : "bg-navy text-ink-inverse";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-9 rounded-full px-3 text-[11px] font-extrabold shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active ? activeTone : "bg-surface-elevated/95 text-ink-secondary backdrop-blur-md"
      }`}
    >
      {label}
    </button>
  );
}
