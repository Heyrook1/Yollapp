/**
 * Saf coğrafi yardımcılar — React/Next yok.
 * Konum doğrulama, mesafe, KKTC hizmet bölgesi.
 */

export type LatLng = { lat: number; lng: number };

/** KKTC yaklaşık merkezi (Lefkoşa). */
export const DEFAULT_MAP_CENTER: LatLng = { lat: 35.1856, lng: 33.3823 };

/** Hizmet bölgesi yaklaşık bounding box (server-controlled bias). */
export const SERVICE_BOUNDS = {
  south: 34.95,
  west: 32.7,
  north: 35.75,
  east: 34.7,
} as const;

export const LOCATION_POLICY = {
  UPDATE_MOVING_INTERVAL_MS: 8_000,
  UPDATE_STATIONARY_INTERVAL_MS: 25_000,
  MIN_DISTANCE_METERS: 25,
  MAX_ACCEPTABLE_ACCURACY_METERS: 80,
  STALE_AFTER_SECONDS: 45,
  OFFLINE_AFTER_SECONDS: 120,
  MAX_HISTORY_RETENTION_DAYS: 14,
  SPEED_MOVING_MPS: 1.5,
} as const;

export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

export function isInsideServiceBounds(point: LatLng): boolean {
  return (
    point.lat >= SERVICE_BOUNDS.south &&
    point.lat <= SERVICE_BOUNDS.north &&
    point.lng >= SERVICE_BOUNDS.west &&
    point.lng <= SERVICE_BOUNDS.east
  );
}

/** Google Geocoding / Places bileşenlerinden TR tarzı tam adres. */
export type StructuredAddressParts = {
  streetNumber?: string | null;
  route?: string | null;
  neighborhood?: string | null;
  district?: string | null;
  city?: string | null;
  postalCode?: string | null;
};

/**
 * Cadde + kapı no, mahalle, ilçe/şehir birleştirir.
 * Örn: "Girne Caddesi No:12, Küçük Kaymaklı, Lefkoşa"
 */
export function formatFullTrAddress(
  parts: StructuredAddressParts,
  fallback?: string | null,
): string {
  const route = parts.route?.trim() || null;
  const streetNumber = parts.streetNumber?.trim() || null;
  const neighborhood = parts.neighborhood?.trim() || null;
  const district = parts.district?.trim() || null;
  const city = parts.city?.trim() || null;
  const postalCode = parts.postalCode?.trim() || null;

  const street =
    route && streetNumber
      ? `${route} No:${streetNumber}`
      : route ?? (streetNumber ? `No:${streetNumber}` : null);

  const chunks: string[] = [];
  if (street) chunks.push(street);
  if (neighborhood) chunks.push(neighborhood);
  if (district && district !== neighborhood && district !== city) {
    chunks.push(district);
  }
  if (city && city !== neighborhood && city !== district) {
    chunks.push(city);
  }
  if (postalCode) chunks.push(postalCode);

  if (chunks.length >= 2) return chunks.join(", ");
  const fb = fallback?.trim() || "";
  if (chunks.length === 1) {
    return fb.length > chunks[0]!.length ? fb : chunks[0]!;
  }
  return fb;
}

/** Haversine mesafe (metre). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function shouldTransmitLocation(params: {
  previous: LatLng | null;
  next: LatLng;
  elapsedMs: number;
  speedMps: number | null;
  accuracyMeters: number | null;
}): { transmit: boolean; reason: string } {
  const { previous, next, elapsedMs, speedMps, accuracyMeters } = params;
  if (!isValidCoordinate(next.lat, next.lng)) {
    return { transmit: false, reason: "invalid_coords" };
  }
  if (
    accuracyMeters !== null &&
    accuracyMeters > LOCATION_POLICY.MAX_ACCEPTABLE_ACCURACY_METERS
  ) {
    return { transmit: false, reason: "accuracy" };
  }
  const moving =
    speedMps !== null && speedMps >= LOCATION_POLICY.SPEED_MOVING_MPS;
  const minInterval = moving
    ? LOCATION_POLICY.UPDATE_MOVING_INTERVAL_MS
    : LOCATION_POLICY.UPDATE_STATIONARY_INTERVAL_MS;
  if (elapsedMs < minInterval) {
    return { transmit: false, reason: "interval" };
  }
  if (previous) {
    const d = distanceMeters(previous, next);
    if (d < LOCATION_POLICY.MIN_DISTANCE_METERS && !moving) {
      return { transmit: false, reason: "distance" };
    }
  }
  return { transmit: true, reason: "ok" };
}

export function locationFreshness(
  lastReceivedAt: Date,
  now: Date = new Date(),
): "live" | "stale" | "offline" {
  const ageSec = (now.getTime() - lastReceivedAt.getTime()) / 1000;
  if (ageSec <= LOCATION_POLICY.STALE_AFTER_SECONDS) return "live";
  if (ageSec <= LOCATION_POLICY.OFFLINE_AFTER_SECONDS) return "stale";
  return "offline";
}

/** Trackable shipment statuses for live location sharing. */
export const TRACKABLE_STATUSES = [
  "MATCHED",
  "PICKED_UP",
  "IN_TRANSIT",
] as const;

export type TrackableStatus = (typeof TRACKABLE_STATUSES)[number];

export function isTrackableStatus(status: string): status is TrackableStatus {
  return (TRACKABLE_STATUSES as readonly string[]).includes(status);
}
