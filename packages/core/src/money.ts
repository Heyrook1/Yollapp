/**
 * All money amounts are integer minor units (kuruş). Float arithmetic is forbidden.
 * Rounding for money happens only in this module.
 */

export type AmountMinor = number;

export function assertAmountMinor(value: unknown): asserts value is AmountMinor {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error("amountMinor must be a non-negative integer");
  }
}

/** Round a decimal major amount (TL) to kuruş. Single allowed rounding site. */
export function toMinor(major: number): AmountMinor {
  if (!Number.isFinite(major) || major < 0) {
    throw new Error("major amount must be a finite non-negative number");
  }
  return Math.round(major * 100);
}

export function toMajor(minor: AmountMinor): number {
  assertAmountMinor(minor);
  return minor / 100;
}

/** Format kuruş for TR UI, e.g. 1250 → "12,50 ₺" */
export function formatTry(minor: AmountMinor): string {
  assertAmountMinor(minor);
  const major = toMajor(minor);
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
  return `${formatted} ₺`;
}

export function multiplyMinor(base: AmountMinor, multiplier: number): AmountMinor {
  assertAmountMinor(base);
  if (!Number.isFinite(multiplier) || multiplier < 0) {
    throw new Error("multiplier must be a finite non-negative number");
  }
  return Math.round(base * multiplier);
}
