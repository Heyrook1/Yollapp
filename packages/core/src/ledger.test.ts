import { describe, expect, it } from "vitest";
import {
  assertEntrySignValid,
  assertPayoutAllowed,
  computeWalletBalances,
  splitDeliveryEarning,
  type LedgerEntryLike,
} from "./ledger";

describe("splitDeliveryEarning", () => {
  it("komisyonu kaynakta keser ve net kazancı verir", () => {
    const split = splitDeliveryEarning(9000, 1500);
    expect(split.grossMinor).toBe(9000);
    expect(split.commissionMinor).toBe(1350);
    expect(split.netMinor).toBe(7650);
    // Brüt her zaman parçaların toplamına eşit olmalı — kuruş kaybı yok.
    expect(split.netMinor + split.commissionMinor).toBe(split.grossMinor);
  });

  it("yuvarlamada kuruş kaybolmaz", () => {
    // 7333 * %15 = 1099.95 → 1100; 7333 - 1100 = 6233
    const split = splitDeliveryEarning(7333, 1500);
    expect(split.netMinor + split.commissionMinor).toBe(7333);
  });

  it("sıfır komisyon tüm tutarı kuryeye bırakır", () => {
    const split = splitDeliveryEarning(5000, 0);
    expect(split.commissionMinor).toBe(0);
    expect(split.netMinor).toBe(5000);
  });

  it("geçersiz komisyon oranı reddedilir", () => {
    expect(() => splitDeliveryEarning(5000, 10_001)).toThrow();
    expect(() => splitDeliveryEarning(5000, -1)).toThrow();
    expect(() => splitDeliveryEarning(5000, 15.5)).toThrow();
  });
});

describe("assertEntrySignValid", () => {
  it("kazanç pozitif, komisyon negatif olmalı", () => {
    expect(() =>
      assertEntrySignValid({ type: "DELIVERY_EARNING", status: "PENDING", amountMinor: -100 }),
    ).toThrow();
    expect(() =>
      assertEntrySignValid({ type: "PLATFORM_COMMISSION", status: "PENDING", amountMinor: 100 }),
    ).toThrow();
  });

  it("sıfır tutarlı kayıt reddedilir", () => {
    expect(() =>
      assertEntrySignValid({ type: "ADJUSTMENT", status: "PENDING", amountMinor: 0 }),
    ).toThrow();
  });

  it("ondalık kuruş reddedilir", () => {
    expect(() =>
      assertEntrySignValid({ type: "TIP", status: "PENDING", amountMinor: 10.5 }),
    ).toThrow();
  });

  it("ADJUSTMENT her iki işarete de izin verir", () => {
    expect(() =>
      assertEntrySignValid({ type: "ADJUSTMENT", status: "PENDING", amountMinor: -250 }),
    ).not.toThrow();
    expect(() =>
      assertEntrySignValid({ type: "ADJUSTMENT", status: "PENDING", amountMinor: 250 }),
    ).not.toThrow();
  });
});

describe("computeWalletBalances", () => {
  it("bakiye satırların toplamıdır, duruma göre ayrışır", () => {
    const entries: LedgerEntryLike[] = [
      { type: "DELIVERY_EARNING", status: "AVAILABLE", amountMinor: 9000 },
      { type: "PLATFORM_COMMISSION", status: "AVAILABLE", amountMinor: -1350 },
      { type: "DELIVERY_EARNING", status: "PENDING", amountMinor: 6000 },
      { type: "PLATFORM_COMMISSION", status: "PENDING", amountMinor: -900 },
      { type: "TIP", status: "AVAILABLE", amountMinor: 2000 },
    ];

    const balances = computeWalletBalances(entries);
    expect(balances.availableMinor).toBe(9650);
    expect(balances.pendingMinor).toBe(5100);
    expect(balances.totalCommissionMinor).toBe(2250);
    expect(balances.totalMinor).toBe(14750);
  });

  it("ödenmiş çekim bakiyeyi düşürür", () => {
    const entries: LedgerEntryLike[] = [
      { type: "DELIVERY_EARNING", status: "PAID", amountMinor: 9000 },
      { type: "PAYOUT", status: "PAID", amountMinor: -9000 },
    ];
    const balances = computeWalletBalances(entries);
    expect(balances.availableMinor).toBe(0);
    expect(balances.totalMinor).toBe(0);
  });

  it("boş defter sıfır bakiye verir", () => {
    const balances = computeWalletBalances([]);
    expect(balances.availableMinor).toBe(0);
    expect(balances.pendingMinor).toBe(0);
    expect(balances.totalMinor).toBe(0);
  });

  it("bozuk kayıt hesaplamayı sessizce geçmez", () => {
    expect(() =>
      computeWalletBalances([
        { type: "DELIVERY_EARNING", status: "AVAILABLE", amountMinor: -1 },
      ]),
    ).toThrow();
  });
});

describe("assertPayoutAllowed", () => {
  const balances = computeWalletBalances([
    { type: "DELIVERY_EARNING", status: "AVAILABLE", amountMinor: 5000 },
  ]);

  it("bakiyeyi aşan çekim reddedilir", () => {
    expect(() => assertPayoutAllowed(5001, balances)).toThrow();
  });

  it("bakiye kadar çekime izin verilir", () => {
    expect(() => assertPayoutAllowed(5000, balances)).not.toThrow();
  });

  it("sıfır tutarlı çekim reddedilir", () => {
    expect(() => assertPayoutAllowed(0, balances)).toThrow();
  });
});
