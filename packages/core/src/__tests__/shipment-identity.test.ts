import { describe, expect, it } from "vitest";
import {
  formatPublicCode,
  isValidDeliveryCodeDigits,
  isValidPublicCodeFormat,
  normalizeDeliveryCodeDigits,
  randomDeliveryCodeDigits,
  randomPublicCodePart,
} from "../shipment-identity";

describe("shipment identity", () => {
  it("public code YLA-XXXX üretir", () => {
    const code = formatPublicCode(randomPublicCodePart(() => 0.1));
    expect(isValidPublicCodeFormat(code)).toBe(true);
  });

  it("teslim kodu 6 hane", () => {
    const digits = randomDeliveryCodeDigits(() => 0.5);
    expect(isValidDeliveryCodeDigits(digits)).toBe(true);
    expect(normalizeDeliveryCodeDigits("12-34-56")).toBe("123456");
  });
});
