import { describe, expect, it } from "vitest";
import { calculatePrice } from "./pricing";
import { canTransition, transition, InvalidTransitionError } from "./shipment-state";

describe("calculatePrice", () => {
  it("computes zone × size without express", () => {
    const result = calculatePrice({
      zoneBaseMinor: 1000,
      sizeMultiplier: 1.5,
      expressPremiumBps: 5000,
      isExpress: false,
    });
    expect(result.subtotalMinor).toBe(1500);
    expect(result.expressPremiumMinor).toBe(0);
    expect(result.amountMinor).toBe(1500);
  });

  it("adds express premium as bps of subtotal", () => {
    const result = calculatePrice({
      zoneBaseMinor: 1000,
      sizeMultiplier: 2,
      expressPremiumBps: 5000,
      isExpress: true,
    });
    expect(result.subtotalMinor).toBe(2000);
    expect(result.expressPremiumMinor).toBe(1000);
    expect(result.amountMinor).toBe(3000);
  });

  it("rejects invalid multiplier", () => {
    expect(() =>
      calculatePrice({
        zoneBaseMinor: 1000,
        sizeMultiplier: 0,
        expressPremiumBps: 0,
        isExpress: false,
      }),
    ).toThrow();
  });
});

describe("shipment-state", () => {
  it("allows DRAFT → QUOTED via QUOTE", () => {
    expect(transition("DRAFT", "QUOTE")).toBe("QUOTED");
  });

  it("allows re-quote while QUOTED", () => {
    expect(transition("QUOTED", "QUOTE")).toBe("QUOTED");
  });

  it("rejects invalid transition", () => {
    expect(canTransition("DRAFT", "DELIVER")).toBe(false);
    expect(() => transition("DRAFT", "DELIVER")).toThrow(InvalidTransitionError);
  });

  it("allows CANCEL from DRAFT and PAID but not DELIVERED", () => {
    expect(transition("DRAFT", "CANCEL")).toBe("CANCELLED");
    expect(transition("PAID", "CANCEL")).toBe("CANCELLED");
    expect(canTransition("DELIVERED", "CANCEL")).toBe(false);
  });
});
