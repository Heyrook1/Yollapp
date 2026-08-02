"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { MapCanvas } from "@/components/ui/MapCanvas";
import { MapPinIcon, NavigationIcon } from "@/components/ui/icons";
import {
  DEFAULT_MAP_CENTER,
  interpolateLatLng,
  isBrowserMapsConfigured,
  loadGoogleMaps,
  type GoogleMapInstance,
  type GoogleMapsApi,
  type GoogleMarkerInstance,
  type GooglePolylineInstance,
} from "@/lib/maps/load-google-maps";

export type MapLatLng = { lat: number; lng: number };

export type PresenceMarker = {
  id: string;
  lat: number;
  lng: number;
  activity: "AVAILABLE" | "ON_JOB" | "BUSY";
  vehicleType: string;
};

type Props = {
  pickup?: MapLatLng | null;
  dropoff?: MapLatLng | null;
  courier?: (MapLatLng & { heading?: number | null }) | null;
  /** Opt-in canlı kurye varlıkları (gönderici/admin haritası) */
  presenceMarkers?: PresenceMarker[] | null;
  encodedPolyline?: string | null;
  className?: string;
  /** Pin sürükleme + haritaya tıklama */
  interactive?: boolean;
  /** interactive iken hangi pin tıklamayla güncellenir */
  activePin?: "pickup" | "dropoff" | null;
  onPickupChange?: (coords: MapLatLng) => void;
  onDropoffChange?: (coords: MapLatLng) => void;
  onMapReady?: () => void;
  showControls?: boolean;
  /** Uber/Bolt tarzı sağ FAB'lar vs alt bar */
  controlsLayout?: "bar" | "fab";
  /** Köşe yuvarlaklığını kapat (full-bleed harita) */
  edgeToEdge?: boolean;
  /** fitBounds padding — alt sheet / üst kart altında pin kaybolmasın */
  fitPadding?: { top: number; right: number; bottom: number; left: number };
  /** Dışarıdan fit / my-location tetiklemek için ref API yerine callback expose */
  controlRef?: MutableRefObject<{
    fitAll: () => void;
    goMyLocation: () => void;
  } | null>;
};

function presenceIcon(activity: PresenceMarker["activity"]) {
  const fill =
    activity === "AVAILABLE"
      ? "#22c55e"
      : activity === "ON_JOB"
        ? "#FF8A00"
        : "#94a3b8";
  return {
    path: "M12 2a6 6 0 016 6c0 4.5-6 12-6 12S6 12.5 6 8a6 6 0 016-6z",
    fillColor: fill,
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: "#ffffff",
    scale: 1.15,
    anchor: { x: 12, y: 22 },
  };
}

function presenceTitle(m: PresenceMarker): string {
  const act =
    m.activity === "AVAILABLE"
      ? "Müsait"
      : m.activity === "ON_JOB"
        ? "Teslimatta"
        : "Meşgul";
  return `${act} · ${m.vehicleType}`;
}

/** Symbol path yerine URL — custom path bazı ortamlarda sessizce düşüyor / ikinci pin görünmüyor */
const PICKUP_ICON =
  "https://maps.google.com/mapfiles/ms/icons/red-dot.png";
const DROPOFF_ICON =
  "https://maps.google.com/mapfiles/ms/icons/blue-dot.png";
const COURIER_ICON =
  "https://maps.google.com/mapfiles/ms/icons/orange-dot.png";

const DEFAULT_FIT_PADDING = { top: 48, right: 48, bottom: 48, left: 48 };

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function GoogleRouteMap({
  pickup,
  dropoff,
  courier,
  presenceMarkers = null,
  encodedPolyline,
  className,
  interactive = false,
  activePin = "pickup",
  onPickupChange,
  onDropoffChange,
  onMapReady,
  showControls = true,
  controlsLayout = "bar",
  edgeToEdge = false,
  fitPadding = DEFAULT_FIT_PADDING,
  controlRef,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const mapsApi = useRef<GoogleMapsApi | null>(null);
  const pickupMarker = useRef<GoogleMarkerInstance | null>(null);
  const dropoffMarker = useRef<GoogleMarkerInstance | null>(null);
  const courierMarker = useRef<GoogleMarkerInstance | null>(null);
  const presenceMarkersRef = useRef<Map<string, GoogleMarkerInstance>>(new Map());
  const polylineRef = useRef<GooglePolylineInstance | null>(null);
  const clickListener = useRef<{ remove: () => void } | null>(null);
  const animFrame = useRef<number | null>(null);
  const courierPos = useRef<MapLatLng | null>(null);
  const userPanned = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  // Haritayı bir kez kur — pin değişince yeniden mount etme.
  useEffect(() => {
    if (!isBrowserMapsConfigured()) return;
    let cancelled = false;
    void (async () => {
      try {
        const maps = await loadGoogleMaps();
        if (cancelled || !hostRef.current) return;
        mapsApi.current = maps;
        const map = new maps.Map(hostRef.current, {
          center: DEFAULT_MAP_CENTER,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "simplified" }] },
          ],
        });
        mapRef.current = map;
        maps.event.addListener(map, "dragstart", () => {
          userPanned.current = true;
        });
        setReady(true);
        onMapReady?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Harita yüklenemedi.");
      }
    })();
    return () => {
      cancelled = true;
      if (animFrame.current !== null) cancelAnimationFrame(animFrame.current);
      clickListener.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Haritaya tıklayınca aktif pin
  useEffect(() => {
    const maps = mapsApi.current;
    const map = mapRef.current;
    if (!maps || !map || !ready || !interactive) return;

    clickListener.current?.remove();
    clickListener.current = maps.event.addListener(map, "click", (...args: unknown[]) => {
      const ev = args[0] as { latLng?: { lat: () => number; lng: () => number } };
      const ll = ev.latLng;
      if (!ll) return;
      const coords = { lat: ll.lat(), lng: ll.lng() };
      if (activePin === "dropoff") onDropoffChange?.(coords);
      else onPickupChange?.(coords);
    });

    return () => clickListener.current?.remove();
  }, [ready, interactive, activePin, onPickupChange, onDropoffChange]);

  // Pin / rota güncelle
  useEffect(() => {
    const maps = mapsApi.current;
    const map = mapRef.current;
    if (!maps || !map || !ready) return;

    const bounds = new maps.LatLngBounds();
    let hasBound = false;

    if (pickup) {
      if (!pickupMarker.current) {
        pickupMarker.current = new maps.Marker({
          map,
          position: pickup,
          draggable: interactive,
          title: "Alım noktası — sürükleyebilirsin",
          icon: PICKUP_ICON,
          label: {
            text: "A",
            color: "#ffffff",
            fontWeight: "700",
            fontSize: "11px",
          },
          zIndex: activePin === "pickup" ? 5 : 3,
        });
        pickupMarker.current.addListener("dragend", () => {
          const pos = pickupMarker.current?.getPosition();
          if (pos) onPickupChange?.({ lat: pos.lat(), lng: pos.lng() });
        });
      } else {
        pickupMarker.current.setMap(map);
        pickupMarker.current.setPosition(pickup);
        pickupMarker.current.setDraggable(interactive);
        pickupMarker.current.setIcon(PICKUP_ICON);
      }
      bounds.extend(pickup);
      hasBound = true;
    } else {
      pickupMarker.current?.setMap(null);
      pickupMarker.current = null;
    }

    if (dropoff) {
      if (!dropoffMarker.current) {
        dropoffMarker.current = new maps.Marker({
          map,
          position: dropoff,
          draggable: interactive,
          title: "Teslimat noktası — sürükleyebilirsin",
          icon: DROPOFF_ICON,
          label: {
            text: "B",
            color: "#ffffff",
            fontWeight: "700",
            fontSize: "11px",
          },
          zIndex: activePin === "dropoff" ? 5 : 4,
        });
        dropoffMarker.current.addListener("dragend", () => {
          const pos = dropoffMarker.current?.getPosition();
          if (pos) onDropoffChange?.({ lat: pos.lat(), lng: pos.lng() });
        });
      } else {
        dropoffMarker.current.setMap(map);
        dropoffMarker.current.setPosition(dropoff);
        dropoffMarker.current.setDraggable(interactive);
        dropoffMarker.current.setIcon(DROPOFF_ICON);
      }
      bounds.extend(dropoff);
      hasBound = true;
    } else {
      dropoffMarker.current?.setMap(null);
      dropoffMarker.current = null;
    }

    if (encodedPolyline && maps.geometry?.encoding) {
      const path = maps.geometry.encoding.decodePath(encodedPolyline).map((p) => ({
        lat: p.lat(),
        lng: p.lng(),
      }));
      if (!polylineRef.current) {
        polylineRef.current = new maps.Polyline({
          path,
          geodesic: true,
          strokeColor: "#0057FF",
          strokeOpacity: 0.9,
          strokeWeight: 5,
          map,
        });
      } else {
        polylineRef.current.setPath(path);
        polylineRef.current.setMap(map);
      }
      for (const p of path) {
        bounds.extend(p);
        hasBound = true;
      }
    } else if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    if (hasBound && !userPanned.current) {
      map.fitBounds(bounds, fitPadding);
    }
  }, [
    pickup,
    dropoff,
    encodedPolyline,
    ready,
    interactive,
    activePin,
    fitPadding,
    onPickupChange,
    onDropoffChange,
  ]);

  // Kurye marker — yumuşak interpolasyon
  useEffect(() => {
    const maps = mapsApi.current;
    const map = mapRef.current;
    if (!maps || !map || !ready) return;

    if (!courier) {
      courierMarker.current?.setMap(null);
      courierMarker.current = null;
      courierPos.current = null;
      return;
    }

    if (!courierMarker.current) {
      courierMarker.current = new maps.Marker({
        map,
        position: courier,
        title: "Kurye",
        icon: COURIER_ICON,
        zIndex: 3,
      });
      courierPos.current = { lat: courier.lat, lng: courier.lng };
      return;
    }

    const from = courierPos.current ?? { lat: courier.lat, lng: courier.lng };
    const to = { lat: courier.lat, lng: courier.lng };
    const dist =
      Math.hypot(to.lat - from.lat, to.lng - from.lng) * 111_000; /* ~m */

    if (prefersReducedMotion() || dist > 800) {
      courierMarker.current.setPosition(to);
      courierPos.current = to;
      return;
    }

    if (animFrame.current !== null) cancelAnimationFrame(animFrame.current);
    const start = performance.now();
    const duration = 700;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const mid = interpolateLatLng(from, to, eased);
      courierMarker.current?.setPosition(mid);
      if (t < 1) animFrame.current = requestAnimationFrame(tick);
      else courierPos.current = to;
    };
    animFrame.current = requestAnimationFrame(tick);
  }, [courier, ready]);

  // Canlı varlık marker'ları (PII yok — yalnızca faaliyet + araç)
  useEffect(() => {
    const maps = mapsApi.current;
    const map = mapRef.current;
    if (!maps || !map || !ready) return;

    const next = presenceMarkers ?? [];
    const seen = new Set<string>();
    for (const m of next) {
      seen.add(m.id);
      const existing = presenceMarkersRef.current.get(m.id);
      if (existing) {
        existing.setPosition({ lat: m.lat, lng: m.lng });
        existing.setIcon(presenceIcon(m.activity));
        existing.setTitle(presenceTitle(m));
      } else {
        const marker = new maps.Marker({
          map,
          position: { lat: m.lat, lng: m.lng },
          title: presenceTitle(m),
          icon: presenceIcon(m.activity),
          zIndex: 1,
          clickable: false,
        });
        presenceMarkersRef.current.set(m.id, marker);
      }
    }
    for (const [id, marker] of presenceMarkersRef.current) {
      if (!seen.has(id)) {
        marker.setMap(null);
        presenceMarkersRef.current.delete(id);
      }
    }
  }, [presenceMarkers, ready]);

  const fitAll = useCallback(() => {
    const maps = mapsApi.current;
    const map = mapRef.current;
    if (!maps || !map) return;
    userPanned.current = false;
    const bounds = new maps.LatLngBounds();
    let n = 0;
    if (pickup) {
      bounds.extend(pickup);
      n++;
    }
    if (dropoff) {
      bounds.extend(dropoff);
      n++;
    }
    if (courier) {
      bounds.extend(courier);
      n++;
    }
    if (n === 0) {
      map.setCenter(DEFAULT_MAP_CENTER);
      map.setZoom(13);
      return;
    }
    if (n === 1) {
      map.panTo(pickup ?? dropoff ?? courier!);
      map.setZoom(15);
      return;
    }
    map.fitBounds(bounds, fitPadding);
  }, [pickup, dropoff, courier, fitPadding]);

  const goMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoMsg("Tarayıcı konum desteklemiyor.");
      return;
    }
    setGeoMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        mapRef.current?.panTo(coords);
        mapRef.current?.setZoom(16);
        userPanned.current = true;
        if (activePin === "dropoff") onDropoffChange?.(coords);
        else onPickupChange?.(coords);
      },
      () => setGeoMsg("Konum alınamadı. İzin verildiğinden emin ol."),
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }, [activePin, onPickupChange, onDropoffChange]);

  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = { fitAll, goMyLocation };
    return () => {
      controlRef.current = null;
    };
  }, [controlRef, fitAll, goMyLocation]);

  if (!isBrowserMapsConfigured()) {
    return (
      <MapCanvas
        variant={pickup && dropoff ? "route" : "idle"}
        className={className}
        pickupLabel="Alım"
        dropoffLabel="Teslim"
      />
    );
  }

  const shellRadius = edgeToEdge ? "rounded-none" : "rounded-3xl";

  return (
    <div className={`relative overflow-hidden ${shellRadius} ${className ?? "h-64 w-full"}`}>
      <div ref={hostRef} className="h-full w-full" />

      {showControls && controlsLayout === "fab" ? (
        <div className="pointer-events-none absolute right-3 bottom-[7.5rem] z-10 flex flex-col gap-2 sm:bottom-24">
          <button
            type="button"
            aria-label="Konumuma git"
            onClick={goMyLocation}
            className="pointer-events-auto flex size-12 items-center justify-center rounded-full bg-white text-navy shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <NavigationIcon size={20} />
          </button>
          <button
            type="button"
            aria-label="Tüm noktaları sığdır"
            onClick={fitAll}
            className="pointer-events-auto flex size-12 items-center justify-center rounded-full bg-white text-navy shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <MapPinIcon size={20} />
          </button>
        </div>
      ) : null}

      {showControls && controlsLayout === "bar" ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col gap-2">
          {interactive ? (
            <p className="pointer-events-none rounded-2xl bg-white/90 px-3 py-2 text-[11px] font-bold text-ink-secondary backdrop-blur">
              {activePin === "dropoff"
                ? "Haritaya dokun veya pin sürükle — teslimat noktası"
                : "Haritaya dokun veya pin sürükle — alım noktası"}
            </p>
          ) : null}
          <div className="pointer-events-auto flex gap-2">
            <button
              type="button"
              onClick={goMyLocation}
              className="min-h-11 rounded-full bg-navy px-4 py-2.5 text-xs font-extrabold text-white shadow-sm"
            >
              Konumum
            </button>
            <button
              type="button"
              onClick={fitAll}
              className="min-h-11 rounded-full border border-border bg-white px-4 py-2.5 text-xs font-extrabold text-ink shadow-sm"
            >
              Sığdır
            </button>
          </div>
        </div>
      ) : null}

      {geoMsg ? (
        <p
          role="status"
          className="absolute inset-x-3 top-3 z-10 rounded-2xl bg-danger-soft px-3 py-2 text-xs font-bold text-danger"
        >
          {geoMsg}
        </p>
      ) : null}

      {error ? (
        <div className="absolute inset-x-3 top-3 z-10 rounded-2xl bg-danger-soft px-3 py-2 text-xs font-bold text-danger">
          {error}
        </div>
      ) : null}
    </div>
  );
}
