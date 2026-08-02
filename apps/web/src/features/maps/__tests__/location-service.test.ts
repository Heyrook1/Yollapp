import { describe, expect, it } from "vitest";
import {
  isInsideServiceBounds,
  isTrackableStatus,
  isValidCoordinate,
  shouldTransmitLocation,
  DEFAULT_MAP_CENTER,
} from "@yolla/core";

describe("maps domain guards", () => {
  it("trackable durumlar doğru", () => {
    expect(isTrackableStatus("MATCHED")).toBe(true);
    expect(isTrackableStatus("DELIVERED")).toBe(false);
  });

  it("hizmet bölgesi KKTC merkezini kapsar", () => {
    expect(isInsideServiceBounds(DEFAULT_MAP_CENTER)).toBe(true);
    expect(isValidCoordinate(DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng)).toBe(true);
  });

  it("düşük doğruluklu konumu iletmez", () => {
    const r = shouldTransmitLocation({
      previous: null,
      next: DEFAULT_MAP_CENTER,
      elapsedMs: 20_000,
      speedMps: 0,
      accuracyMeters: 200,
    });
    expect(r.transmit).toBe(false);
    expect(r.reason).toBe("accuracy");
  });
});
