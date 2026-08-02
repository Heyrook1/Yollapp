import { describe, expect, it } from "vitest";
import { homePathForMode, parseAppMode, resolvePostAuthPath } from "../mode";

describe("mode router", () => {
  it("next param önceliklidir", () => {
    expect(resolvePostAuthPath("/courier/jobs", "sender")).toBe("/courier/jobs");
  });

  it("next yoksa cookie moda gider", () => {
    expect(resolvePostAuthPath(null, "courier")).toBe("/courier/jobs");
    expect(resolvePostAuthPath(null, "sender")).toBe("/sender");
  });

  it("geçersiz next düşer", () => {
    expect(resolvePostAuthPath("//evil.com", "courier")).toBe("/courier/jobs");
    expect(resolvePostAuthPath("https://x", null)).toBe("/sender");
  });

  it("parse ve home path", () => {
    expect(parseAppMode("courier")).toBe("courier");
    expect(homePathForMode("sender")).toBe("/sender");
  });
});
