import { describe, expect, it } from "vitest";
import { quotePrice, type PricingDb } from "../service";

function createPricingDb(overrides?: Partial<PricingDb>): PricingDb {
  const base: PricingDb = {
    findActiveZone: async (id) =>
      id === "zone-1"
        ? { id: "zone-1", baseFeeMinor: 5000, isActive: true }
        : null,
    findActiveSizeClass: async (id) =>
      id === "size-m"
        ? { id: "size-m", multiplier: 1.5, isActive: true }
        : null,
    getPlatformConfig: async () => ({
      commissionBps: 1500,
      expressPremiumBps: 5000,
    }),
  };
  return { ...base, ...overrides };
}

describe("quotePrice", () => {
  it("quotes zone × size without trusting client price", async () => {
    const result = await quotePrice(
      { zoneId: "zone-1", sizeClassId: "size-m", isExpress: false },
      createPricingDb(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amountMinor).toBe(7500);
      expect(result.value.expressPremiumMinor).toBe(0);
    }
  });

  it("adds express premium from platform config", async () => {
    const result = await quotePrice(
      { zoneId: "zone-1", sizeClassId: "size-m", isExpress: true },
      createPricingDb(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.subtotalMinor).toBe(7500);
      expect(result.value.expressPremiumMinor).toBe(3750);
      expect(result.value.amountMinor).toBe(11250);
    }
  });

  it("fails when zone missing", async () => {
    const result = await quotePrice(
      { zoneId: "missing", sizeClassId: "size-m", isExpress: false },
      createPricingDb(),
    );
    expect(result.ok).toBe(false);
  });
});
