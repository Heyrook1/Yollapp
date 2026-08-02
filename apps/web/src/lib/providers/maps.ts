import {
  ConflictError,
  DEFAULT_MAP_CENTER,
  SERVICE_BOUNDS,
  formatFullTrAddress,
  isInsideServiceBounds,
  isValidCoordinate,
  type LatLng,
} from "@yolla/core";

type GeoComponent = {
  long_name?: string;
  short_name?: string;
  longText?: string;
  shortText?: string;
  types?: string[];
};

function componentName(c: GeoComponent): string | null {
  return c.longText?.trim() || c.long_name?.trim() || null;
}

function findComponent(components: GeoComponent[], type: string): string | null {
  const hit = components.find((c) => c.types?.includes(type));
  return hit ? componentName(hit) : null;
}

function structuredFromComponents(components: GeoComponent[]) {
  return {
    streetNumber: findComponent(components, "street_number"),
    route: findComponent(components, "route"),
    neighborhood:
      findComponent(components, "neighborhood") ??
      findComponent(components, "sublocality_level_1") ??
      findComponent(components, "sublocality") ??
      findComponent(components, "administrative_area_level_4"),
    district:
      findComponent(components, "administrative_area_level_2") ??
      findComponent(components, "locality"),
    city:
      findComponent(components, "administrative_area_level_1") ??
      findComponent(components, "locality"),
    postalCode: findComponent(components, "postal_code"),
  };
}

function scoreAddressDetail(components: GeoComponent[]): number {
  let score = 0;
  if (findComponent(components, "street_number")) score += 4;
  if (findComponent(components, "route")) score += 3;
  if (findComponent(components, "premise")) score += 2;
  if (
    findComponent(components, "neighborhood") ||
    findComponent(components, "sublocality") ||
    findComponent(components, "sublocality_level_1")
  ) {
    score += 2;
  }
  if (findComponent(components, "locality") || findComponent(components, "administrative_area_level_2")) {
    score += 1;
  }
  return score;
}

/**
 * Google Maps sunucu adaptörü — Routes API (New) + Places API (New).
 * Browser key ASLA burada kullanılmaz.
 */

export type RouteRequest = {
  origin: LatLng;
  destination: LatLng;
  /** TRAFFIC_AWARE when available */
  routingPreference?: "TRAFFIC_UNAWARE" | "TRAFFIC_AWARE";
};

export type RouteResult = {
  routeId: string;
  origin: LatLng;
  destination: LatLng;
  encodedPolyline: string;
  distanceMeters: number;
  durationSeconds: number;
  trafficAwareDurationSeconds: number | null;
  provider: "google_routes" | "none";
  calculatedAt: string;
  expiresAt: string;
  warnings: string[];
};

export type PlaceSuggestion = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
};

export type PlaceDetails = {
  placeId: string;
  formattedAddress: string;
  location: LatLng;
  addressLine: string | null;
  district: string | null;
  city: string | null;
  countryCode: string | null;
};

export type MapsProvider = {
  name: string;
  isOperational: boolean;
  computeRoute: (input: RouteRequest) => Promise<RouteResult>;
  autocomplete: (input: {
    query: string;
    sessionToken: string;
    locationBias?: LatLng;
  }) => Promise<PlaceSuggestion[]>;
  placeDetails: (input: {
    placeId: string;
    sessionToken: string;
  }) => Promise<PlaceDetails>;
  /** Koordinattan açık adres (otomatik konum / harita pini) */
  reverseGeocode: (input: LatLng) => Promise<PlaceDetails>;
};

const ROUTE_TTL_MS = 15 * 60 * 1000;

function serverKey(): string | null {
  return process.env.GOOGLE_MAPS_SERVER_KEY?.trim() || null;
}

function assertInZone(point: LatLng, label: string): void {
  if (!isValidCoordinate(point.lat, point.lng)) {
    throw new ConflictError(`${label} koordinatı geçersiz.`);
  }
  if (!isInsideServiceBounds(point)) {
    throw new ConflictError(`${label} hizmet bölgesi dışında.`);
  }
}

function parseDurationSeconds(raw: string | undefined): number {
  if (!raw) return 0;
  // "1234s"
  const m = /^(\d+(?:\.\d+)?)s$/.exec(raw);
  return m ? Math.round(Number(m[1])) : 0;
}

const unavailable: MapsProvider = {
  name: "none",
  isOperational: false,
  async computeRoute() {
    throw new ConflictError("Harita sağlayıcısı yapılandırılmadı (GOOGLE_MAPS_SERVER_KEY).");
  },
  async autocomplete() {
    throw new ConflictError("Adres arama yapılandırılmadı.");
  },
  async placeDetails() {
    throw new ConflictError("Adres detayı yapılandırılmadı.");
  },
  async reverseGeocode() {
    throw new ConflictError("Adres çözümleme yapılandırılmadı.");
  },
};

function googleProvider(apiKey: string): MapsProvider {
  return {
    name: "google",
    isOperational: true,

    async computeRoute(input) {
      assertInZone(input.origin, "Alım noktası");
      assertInZone(input.destination, "Teslimat noktası");

      const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.warnings",
        },
        body: JSON.stringify({
          origin: {
            location: { latLng: { latitude: input.origin.lat, longitude: input.origin.lng } },
          },
          destination: {
            location: {
              latLng: { latitude: input.destination.lat, longitude: input.destination.lng },
            },
          },
          travelMode: "DRIVE",
          routingPreference: input.routingPreference ?? "TRAFFIC_AWARE",
          languageCode: "tr",
          regionCode: "CY",
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error("routes api failed", { status: res.status, body: body.slice(0, 200) });
        throw new ConflictError("Rota hesaplanamadı. Lütfen tekrar deneyin.");
      }

      const data = (await res.json()) as {
        routes?: Array<{
          distanceMeters?: number;
          duration?: string;
          staticDuration?: string;
          polyline?: { encodedPolyline?: string };
          warnings?: string[];
        }>;
      };

      const route = data.routes?.[0];
      if (!route?.polyline?.encodedPolyline || !route.distanceMeters) {
        throw new ConflictError("Bu noktalar arasında rota bulunamadı.");
      }

      const durationSeconds = parseDurationSeconds(route.duration ?? route.staticDuration);
      const staticSeconds = parseDurationSeconds(route.staticDuration);
      const now = Date.now();

      return {
        routeId: `gr_${now.toString(36)}`,
        origin: input.origin,
        destination: input.destination,
        encodedPolyline: route.polyline.encodedPolyline,
        distanceMeters: route.distanceMeters,
        durationSeconds: durationSeconds || staticSeconds,
        trafficAwareDurationSeconds:
          route.duration && route.staticDuration ? durationSeconds : null,
        provider: "google_routes",
        calculatedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + ROUTE_TTL_MS).toISOString(),
        warnings: route.warnings ?? [],
      };
    },

    async autocomplete({ query, sessionToken, locationBias }) {
      const bias = locationBias ?? DEFAULT_MAP_CENTER;
      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify({
          input: query,
          languageCode: "tr",
          includedRegionCodes: ["CY"],
          includedPrimaryTypes: ["street_address", "route", "geocode", "establishment"],
          locationBias: {
            circle: {
              center: { latitude: bias.lat, longitude: bias.lng },
              radius: 50000.0,
            },
          },
          sessionToken,
        }),
      });

      if (!res.ok) {
        console.error("places autocomplete failed", { status: res.status });
        throw new ConflictError("Adres araması başarısız.");
      }

      const data = (await res.json()) as {
        suggestions?: Array<{
          placePrediction?: {
            placeId?: string;
            structuredFormat?: {
              mainText?: { text?: string };
              secondaryText?: { text?: string };
            };
          };
        }>;
      };

      return (data.suggestions ?? [])
        .map((s) => s.placePrediction)
        .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
        .map((p) => ({
          placeId: p.placeId!,
          primaryText: p.structuredFormat?.mainText?.text ?? "",
          secondaryText: p.structuredFormat?.secondaryText?.text ?? "",
        }));
    },

    async placeDetails({ placeId, sessionToken }) {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
        {
          method: "GET",
          headers: {
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "id,formattedAddress,location,addressComponents,displayName",
            "X-Goog-Session-Token": sessionToken,
          },
        },
      );

      if (!res.ok) {
        throw new ConflictError("Adres detayı alınamadı.");
      }

      const data = (await res.json()) as {
        id?: string;
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        addressComponents?: Array<{
          longText?: string;
          shortText?: string;
          types?: string[];
        }>;
      };

      const lat = data.location?.latitude;
      const lng = data.location?.longitude;
      if (lat === undefined || lng === undefined || !isValidCoordinate(lat, lng)) {
        throw new ConflictError("Seçilen adresin konumu geçersiz.");
      }
      if (!isInsideServiceBounds({ lat, lng })) {
        throw new ConflictError("Bu adres hizmet bölgemiz dışında.");
      }

      const components = data.addressComponents ?? [];
      const parts = structuredFromComponents(components);
      const formattedAddress = formatFullTrAddress(
        parts,
        data.formattedAddress ?? null,
      );

      return {
        placeId: data.id ?? placeId,
        formattedAddress,
        location: { lat, lng },
        addressLine: formattedAddress || data.formattedAddress || null,
        district: parts.district,
        city: parts.city,
        countryCode:
          components.find((c) => c.types?.includes("country"))?.shortText ?? "CY",
      };
    },

    async reverseGeocode(input) {
      assertInZone(input, "Konum");

      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("latlng", `${input.lat},${input.lng}`);
      url.searchParams.set("language", "tr");
      url.searchParams.set("region", "cy");
      // Sokak / kapı no içeren sonuçları tercih et
      url.searchParams.set(
        "result_type",
        "street_address|premise|subpremise|route|neighborhood|sublocality",
      );
      url.searchParams.set("key", apiKey);

      const res = await fetch(url.toString(), { method: "GET" });
      if (!res.ok) {
        console.error("reverse geocode http failed", { status: res.status });
        throw new ConflictError("Adres bulunamadı.");
      }

      const data = (await res.json()) as {
        status?: string;
        results?: Array<{
          place_id?: string;
          formatted_address?: string;
          types?: string[];
          address_components?: GeoComponent[];
          geometry?: { location?: { lat?: number; lng?: number } };
        }>;
      };

      // result_type filtresi boş dönerse filtresiz tekrar dene
      let results = data.results ?? [];
      if (
        (data.status === "ZERO_RESULTS" || results.length === 0) &&
        data.status !== "REQUEST_DENIED"
      ) {
        const retryUrl = new URL("https://maps.googleapis.com/maps/api/geocode/json");
        retryUrl.searchParams.set("latlng", `${input.lat},${input.lng}`);
        retryUrl.searchParams.set("language", "tr");
        retryUrl.searchParams.set("region", "cy");
        retryUrl.searchParams.set("key", apiKey);
        const retry = await fetch(retryUrl.toString(), { method: "GET" });
        if (retry.ok) {
          const retryData = (await retry.json()) as typeof data;
          results = retryData.results ?? [];
          if (retryData.status !== "OK" && results.length === 0) {
            console.error("reverse geocode status", { status: retryData.status });
            throw new ConflictError("Bu konum için açık adres bulunamadı.");
          }
        }
      } else if (data.status !== "OK" || results.length === 0) {
        console.error("reverse geocode status", { status: data.status });
        throw new ConflictError("Bu konum için açık adres bulunamadı.");
      }

      const top = [...results].sort(
        (a, b) =>
          scoreAddressDetail(b.address_components ?? []) -
          scoreAddressDetail(a.address_components ?? []),
      )[0]!;

      const components = top.address_components ?? [];
      const parts = structuredFromComponents(components);
      const formattedAddress = formatFullTrAddress(
        parts,
        top.formatted_address ?? null,
      );

      // Pin GPS/tıklama noktasında kalsın — geocode geometrisine kaydırma
      return {
        placeId: top.place_id ?? `geo:${input.lat.toFixed(5)},${input.lng.toFixed(5)}`,
        formattedAddress,
        location: { lat: input.lat, lng: input.lng },
        addressLine: formattedAddress || top.formatted_address || null,
        district: parts.district,
        city: parts.city,
        countryCode:
          components.find((c) => c.types?.includes("country"))?.short_name ?? "CY",
      };
    },
  };
}

export function getMapsProvider(): MapsProvider {
  const enabled = process.env.GOOGLE_MAPS_ROUTES_ENABLED !== "false";
  const key = serverKey();
  if (!enabled || !key) return unavailable;
  return googleProvider(key);
}

export function getServiceRegionConfig() {
  return {
    defaultCenter: DEFAULT_MAP_CENTER,
    bounds: SERVICE_BOUNDS,
    cities: ["Lefkoşa", "Gazimağusa", "Girne", "İskele", "Güzelyurt", "Lefke"] as const,
  };
}
