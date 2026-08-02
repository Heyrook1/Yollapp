import { describe, expect, it } from "vitest";
import {
  deriveCourierActivity,
  isCourierActivity,
  isPresenceListable,
} from "../presence";

describe("deriveCourierActivity", () => {
  it("paylaşım kapalıysa null döner", () => {
    expect(
      deriveCourierActivity({
        sharingEnabled: false,
        carryingPassenger: false,
        hasActiveTrackableJob: true,
      }),
    ).toBeNull();
  });

  it("yolcu taşıyorsa BUSY", () => {
    expect(
      deriveCourierActivity({
        sharingEnabled: true,
        carryingPassenger: true,
        hasActiveTrackableJob: false,
      }),
    ).toBe("BUSY");
  });

  it("aktif işte ON_JOB", () => {
    expect(
      deriveCourierActivity({
        sharingEnabled: true,
        carryingPassenger: false,
        hasActiveTrackableJob: true,
      }),
    ).toBe("ON_JOB");
  });

  it("iş yoksa AVAILABLE", () => {
    expect(
      deriveCourierActivity({
        sharingEnabled: true,
        carryingPassenger: false,
        hasActiveTrackableJob: false,
      }),
    ).toBe("AVAILABLE");
  });

  it("forceBusy AVAILABLE yerine BUSY", () => {
    expect(
      deriveCourierActivity({
        sharingEnabled: true,
        carryingPassenger: false,
        hasActiveTrackableJob: false,
        forceBusy: true,
      }),
    ).toBe("BUSY");
  });
});

describe("isPresenceListable", () => {
  it("stale offline düşer", () => {
    const now = new Date("2026-08-01T12:00:00.000Z");
    expect(
      isPresenceListable({
        sharingEnabled: true,
        lastSeenAt: new Date("2026-08-01T11:57:00.000Z"),
        now,
      }),
    ).toBe(false);
  });

  it("canlı konum listelenir", () => {
    const now = new Date("2026-08-01T12:00:00.000Z");
    expect(
      isPresenceListable({
        sharingEnabled: true,
        lastSeenAt: new Date("2026-08-01T11:59:50.000Z"),
        now,
      }),
    ).toBe(true);
  });

  it("activity enum doğrular", () => {
    expect(isCourierActivity("AVAILABLE")).toBe(true);
    expect(isCourierActivity("OFFLINE")).toBe(false);
  });
});
