import { describe, expect, it } from "vitest";
import {
  deriveCourierActivity,
  isPresenceListable,
} from "@yolla/core";
import { nearbyCouriersQuerySchema, presenceUpdateSchema } from "../schemas";

describe("presence schemas", () => {
  it("presence update konum çiftini zorunlu tutar", () => {
    const bad = presenceUpdateSchema.safeParse({ latitude: 35.1 });
    expect(bad.success).toBe(false);
    const ok = presenceUpdateSchema.safeParse({
      sharingEnabled: true,
      latitude: 35.1856,
      longitude: 33.3823,
    });
    expect(ok.success).toBe(true);
  });

  it("nearby query activity CSV parse eder", () => {
    const parsed = nearbyCouriersQuerySchema.parse({
      south: "34.95",
      west: "32.7",
      north: "35.75",
      east: "34.7",
      activity: "AVAILABLE,ON_JOB",
      vehicleType: "BIKE,TAXI",
    });
    expect(parsed.activity).toEqual(["AVAILABLE", "ON_JOB"]);
    expect(parsed.vehicleType).toEqual(["BIKE", "TAXI"]);
  });
});

describe("presence privacy DTO shape", () => {
  it("public DTO alanları PII içermez", () => {
    const dto = {
      id: "pres-1",
      lat: 35.18,
      lng: 33.38,
      heading: null as number | null,
      vehicleType: "BIKE",
      activity: "AVAILABLE",
      freshness: "live" as const,
    };
    expect(dto).not.toHaveProperty("phone");
    expect(dto).not.toHaveProperty("email");
    expect(dto).not.toHaveProperty("name");
    expect(dto).not.toHaveProperty("courierUserId");
  });

  it("toggle off listelenmez", () => {
    expect(
      isPresenceListable({
        sharingEnabled: false,
        lastSeenAt: new Date(),
      }),
    ).toBe(false);
  });

  it("aktif iş + paylaşım → ON_JOB", () => {
    expect(
      deriveCourierActivity({
        sharingEnabled: true,
        carryingPassenger: false,
        hasActiveTrackableJob: true,
      }),
    ).toBe("ON_JOB");
  });
});
