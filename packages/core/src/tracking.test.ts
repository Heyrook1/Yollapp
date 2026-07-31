import { describe, expect, it } from "vitest";
import {
  checkTrackingToken,
  maskAddress,
  maskRecipientName,
  trackingTokenExpiry,
} from "./tracking";

const now = new Date("2026-08-01T12:00:00.000Z");

describe("checkTrackingToken", () => {
  it("süresi dolmamış ve iptal edilmemiş token kullanılabilir", () => {
    const result = checkTrackingToken(
      { expiresAt: new Date("2026-08-02T12:00:00.000Z"), revokedAt: null },
      now,
    );
    expect(result.usable).toBe(true);
  });

  it("süresi dolmuş token reddedilir", () => {
    const result = checkTrackingToken(
      { expiresAt: new Date("2026-07-31T12:00:00.000Z"), revokedAt: null },
      now,
    );
    expect(result).toEqual({ usable: false, reason: "expired" });
  });

  it("iptal edilmiş token süresi dolmasa da reddedilir", () => {
    const result = checkTrackingToken(
      {
        expiresAt: new Date("2026-08-30T12:00:00.000Z"),
        revokedAt: new Date("2026-08-01T10:00:00.000Z"),
      },
      now,
    );
    expect(result).toEqual({ usable: false, reason: "revoked" });
  });

  it("tam sona erme anında reddedilir (sınır değeri)", () => {
    const result = checkTrackingToken({ expiresAt: now, revokedAt: null }, now);
    expect(result.usable).toBe(false);
  });
});

describe("trackingTokenExpiry", () => {
  it("varsayılan 14 gün sonrasını verir", () => {
    const expiry = trackingTokenExpiry(now);
    expect(expiry.toISOString()).toBe("2026-08-15T12:00:00.000Z");
  });
});

describe("kişisel veri maskeleme", () => {
  it("alıcı soyadı baş harfe iner", () => {
    expect(maskRecipientName("Ayşe Kaya")).toBe("Ayşe K.");
    expect(maskRecipientName("Mehmet Ali Yılmaz")).toBe("Mehmet A. Y.");
  });

  it("tek isimde değişiklik olmaz", () => {
    expect(maskRecipientName("Ayşe")).toBe("Ayşe");
  });

  it("boş isim güvenli değer döner", () => {
    expect(maskRecipientName("   ")).toBe("—");
  });

  it("adres yalnızca bölgeye iner — sokak/numara gizlenir", () => {
    expect(maskAddress("Karakum Sitesi B Blok, Daire 4, Girne")).toBe("Girne");
  });

  it("tek parçalı adres tamamen gizlenir", () => {
    expect(maskAddress("Bedrettin Demirel Cad. 24")).toBe("Adres gizli");
  });
});
