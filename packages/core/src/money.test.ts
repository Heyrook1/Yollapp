import { describe, expect, it } from "vitest";
import { formatTry, multiplyMinor, toMajor, toMinor } from "./money";

describe("money", () => {
  it("converts major TL to kuruş with single rounding site", () => {
    expect(toMinor(12.5)).toBe(1250);
    expect(toMinor(12.505)).toBe(1251);
  });

  it("converts kuruş back to major", () => {
    expect(toMajor(1250)).toBe(12.5);
  });

  it("formats TRY for Turkish UI", () => {
    expect(formatTry(1250)).toBe("12,50 ₺");
    expect(formatTry(0)).toBe("0,00 ₺");
  });

  it("multiplies minor amounts with rounding", () => {
    expect(multiplyMinor(1000, 1.5)).toBe(1500);
  });

  it("rejects negative and non-integer minor amounts", () => {
    expect(() => formatTry(-1)).toThrow();
    expect(() => formatTry(1.5)).toThrow();
  });
});
