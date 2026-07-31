import { multiplyMinor, type AmountMinor } from "./money";

export type PriceInput = {
  zoneBaseMinor: AmountMinor;
  sizeMultiplier: number;
  /** Express premium as basis points of the base×size subtotal (e.g. 5000 = +50%). */
  expressPremiumBps: number;
  isExpress: boolean;
};

export type PriceBreakdown = {
  zoneBaseMinor: AmountMinor;
  sizeMultiplier: number;
  subtotalMinor: AmountMinor;
  expressPremiumMinor: AmountMinor;
  amountMinor: AmountMinor;
};

/**
 * Price = zone base × size multiplier (+ express premium on that subtotal).
 * Rounding only via money helpers.
 */
export function calculatePrice(input: PriceInput): PriceBreakdown {
  if (!Number.isFinite(input.sizeMultiplier) || input.sizeMultiplier <= 0) {
    throw new Error("sizeMultiplier must be a positive finite number");
  }
  if (!Number.isInteger(input.expressPremiumBps) || input.expressPremiumBps < 0) {
    throw new Error("expressPremiumBps must be a non-negative integer");
  }

  const subtotalMinor = multiplyMinor(input.zoneBaseMinor, input.sizeMultiplier);
  const expressPremiumMinor = input.isExpress
    ? multiplyMinor(subtotalMinor, input.expressPremiumBps / 10_000)
    : 0;
  const amountMinor = subtotalMinor + expressPremiumMinor;

  return {
    zoneBaseMinor: input.zoneBaseMinor,
    sizeMultiplier: input.sizeMultiplier,
    subtotalMinor,
    expressPremiumMinor,
    amountMinor,
  };
}
