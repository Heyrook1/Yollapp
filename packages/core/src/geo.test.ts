import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAP_CENTER,
  distanceMeters,
  formatFullTrAddress,
  isInsideServiceBounds,
  isValidCoordinate,
  locationFreshness,
  shouldTransmitLocation,
} from "./geo";

describe("isValidCoordinate", () => {
  it("geçerli KKTC noktası kabul edilir", () => {
    expect(isValidCoordinate(DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng)).toBe(true);
  });
  it("0,0 ve NaN reddedilir", () => {
    expect(isValidCoordinate(0, 0)).toBe(false);
    expect(isValidCoordinate(Number.NaN, 33)).toBe(false);
  });
});

describe("isInsideServiceBounds", () => {
  it("Lefkoşa hizmet bölgesinde", () => {
    expect(isInsideServiceBounds(DEFAULT_MAP_CENTER)).toBe(true);
  });
  it("uzak nokta dışarıda", () => {
    expect(isInsideServiceBounds({ lat: 41.0, lng: 29.0 })).toBe(false);
  });
});

describe("distanceMeters", () => {
  it("yakın noktalar kısa mesafe verir", () => {
    const d = distanceMeters(DEFAULT_MAP_CENTER, {
      lat: DEFAULT_MAP_CENTER.lat + 0.01,
      lng: DEFAULT_MAP_CENTER.lng,
    });
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1300);
  });
});

describe("shouldTransmitLocation", () => {
  it("aralık dolmadan göndermez", () => {
    const r = shouldTransmitLocation({
      previous: DEFAULT_MAP_CENTER,
      next: { lat: 35.19, lng: 33.39 },
      elapsedMs: 1000,
      speedMps: 10,
      accuracyMeters: 10,
    });
    expect(r.transmit).toBe(false);
    expect(r.reason).toBe("interval");
  });

  it("hareket + aralık dolunca gönderir", () => {
    const r = shouldTransmitLocation({
      previous: DEFAULT_MAP_CENTER,
      next: { lat: 35.2, lng: 33.4 },
      elapsedMs: 10_000,
      speedMps: 8,
      accuracyMeters: 15,
    });
    expect(r.transmit).toBe(true);
  });
});

describe("locationFreshness", () => {
  it("yaşa göre live/stale/offline", () => {
    const now = new Date("2026-08-01T12:00:00Z");
    expect(locationFreshness(new Date("2026-08-01T11:59:30Z"), now)).toBe("live");
    expect(locationFreshness(new Date("2026-08-01T11:58:30Z"), now)).toBe("stale");
    expect(locationFreshness(new Date("2026-08-01T11:50:00Z"), now)).toBe("offline");
  });
});

describe("formatFullTrAddress", () => {
  it("cadde, kapı, mahalle ve şehir birleştirir", () => {
    expect(
      formatFullTrAddress({
        route: "Girne Caddesi",
        streetNumber: "12",
        neighborhood: "Küçük Kaymaklı",
        city: "Lefkoşa",
      }),
    ).toBe("Girne Caddesi No:12, Küçük Kaymaklı, Lefkoşa");
  });

  it("bileşen yoksa fallback kullanır", () => {
    expect(formatFullTrAddress({}, "Genel adres")).toBe("Genel adres");
  });
});
