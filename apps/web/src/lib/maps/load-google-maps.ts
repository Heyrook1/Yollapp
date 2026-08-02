import { DEFAULT_MAP_CENTER } from "@yolla/core";

/** Loose maps namespace — avoids adding @types/google.maps package. */
export type GoogleMapsApi = {
  Map: new (el: HTMLElement, opts?: Record<string, unknown>) => GoogleMapInstance;
  Marker: new (opts?: Record<string, unknown>) => GoogleMarkerInstance;
  Polyline: new (opts?: Record<string, unknown>) => GooglePolylineInstance;
  LatLngBounds: new () => GoogleLatLngBounds;
  geometry?: {
    encoding?: {
      decodePath: (encoded: string) => Array<{ lat: () => number; lng: () => number }>;
    };
  };
  event: {
    clearInstanceListeners: (instance: unknown) => void;
    addListener: (
      instance: unknown,
      eventName: string,
      handler: (...args: unknown[]) => void,
    ) => { remove: () => void };
  };
};

export type GoogleMapInstance = {
  setCenter: (c: { lat: number; lng: number }) => void;
  setZoom: (z: number) => void;
  fitBounds: (b: GoogleLatLngBounds, padding?: number | Record<string, number>) => void;
  panTo: (c: { lat: number; lng: number }) => void;
  getZoom: () => number | undefined;
  getCenter: () => { lat: () => number; lng: () => number } | undefined;
};

export type GoogleMarkerInstance = {
  setPosition: (c: { lat: number; lng: number } | null) => void;
  setMap: (m: GoogleMapInstance | null) => void;
  setDraggable: (d: boolean) => void;
  setTitle: (t: string) => void;
  setIcon: (icon: unknown) => void;
  addListener: (event: string, handler: (...args: unknown[]) => void) => { remove?: () => void };
  getPosition: () => { lat: () => number; lng: () => number } | null;
};

export type GooglePolylineInstance = {
  setMap: (m: GoogleMapInstance | null) => void;
  setPath: (path: Array<{ lat: number; lng: number }>) => void;
};

export type GoogleLatLngBounds = {
  extend: (c: { lat: number; lng: number }) => void;
  isEmpty?: () => boolean;
};

let loadPromise: Promise<GoogleMapsApi> | null = null;

declare global {
  interface Window {
    google?: { maps: GoogleMapsApi };
    __yollaMapsCb?: () => void;
  }
}

export function getBrowserMapsKey(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY?.trim() || null;
}

export function isBrowserMapsConfigured(): boolean {
  return Boolean(getBrowserMapsKey());
}

export function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps yalnızca tarayıcıda yüklenir."));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (loadPromise) return loadPromise;

  const key = getBrowserMapsKey();
  if (!key) {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY eksik."));
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=geometry&language=tr&region=CY&callback=__yollaMapsCb`;
    script.async = true;
    script.defer = true;
    window.__yollaMapsCb = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error("Google Maps yüklenemedi."));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Google Maps script hatası."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export { DEFAULT_MAP_CENTER };

/** Basit doğrusal interpolasyon — GPS noktaları arasında yumuşak marker hareketi. */
export function interpolateLatLng(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  t: number,
): { lat: number; lng: number } {
  const u = Math.min(1, Math.max(0, t));
  return {
    lat: from.lat + (to.lat - from.lat) * u,
    lng: from.lng + (to.lng - from.lng) * u,
  };
}
