"use client";

import { createClient } from "@/lib/supabase/client";
import type { SelectedPlace } from "./components/AddressAutocomplete";
import type { MapLatLng } from "./components/GoogleRouteMap";

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
 * Harita / GPS koordinatını açık adrese çevirir.
 * Başarısız olursa koordinat metnine düşer — "Haritadan seçilen…" kullanılmaz.
 */
export async function resolveCoordsToPlace(coords: MapLatLng): Promise<SelectedPlace> {
  const fallbackId = `map:${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
  try {
    const headers = await authHeaders();
    const res = await fetch("/api/v1/maps/geocode", {
      method: "POST",
      headers,
      body: JSON.stringify(coords),
    });
    const json = (await res.json()) as {
      place?: {
        placeId: string;
        formattedAddress: string;
        location: MapLatLng;
      };
    };
    if (res.ok && json.place?.formattedAddress) {
      return {
        placeId: json.place.placeId,
        formattedAddress: json.place.formattedAddress,
        // Pin her zaman kullanıcının GPS/tıklama noktasında kalsın
        lat: coords.lat,
        lng: coords.lng,
      };
    }
  } catch {
    /* fallback below */
  }
  return {
    placeId: fallbackId,
    formattedAddress: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
    lat: coords.lat,
    lng: coords.lng,
  };
}
