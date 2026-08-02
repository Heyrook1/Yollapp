import { describe, expect, it } from "vitest";
import { splitDeliveryEarning } from "@yolla/core";
import {
  buildDeliverySettlementEntries,
  commissionIdempotencyKey,
  earningIdempotencyKey,
  settleDeliveryEarning,
  type LedgerWriteRecord,
  type WalletLedgerDb,
} from "../service";

function memoryWalletDb(quote?: { amountMinor: number; commissionBps: number }) {
  const ledger = new Map<string, LedgerWriteRecord>();
  const db: WalletLedgerDb = {
    ensureWallet: async (userId) => ({ id: `w-${userId}` }),
    findQuoteByShipmentId: async () => quote ?? null,
    hasIdempotencyKey: async (key) => ledger.has(key),
    createLedgerEntry: async (data) => {
      ledger.set(data.idempotencyKey, data);
    },
  };
  return { db, ledger };
}

describe("buildDeliverySettlementEntries", () => {
  it("brüt kazanç + negatif komisyon satırı üretir; net = SUM", () => {
    const built = buildDeliverySettlementEntries({
      walletId: "w1",
      shipmentId: "11111111-1111-1111-1111-111111111111",
      amountMinor: 9000,
      commissionBps: 1500,
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.value).toHaveLength(2);
    const sum = built.value.reduce((a, e) => a + e.amountMinor, 0);
    expect(sum).toBe(splitDeliveryEarning(9000, 1500).netMinor);
    expect(built.value[0]!.idempotencyKey).toBe(
      earningIdempotencyKey("11111111-1111-1111-1111-111111111111"),
    );
    expect(built.value[1]!.idempotencyKey).toBe(
      commissionIdempotencyKey("11111111-1111-1111-1111-111111111111"),
    );
  });

  it("sıfır komisyonda yalnızca kazanç satırı yazar", () => {
    const built = buildDeliverySettlementEntries({
      walletId: "w1",
      shipmentId: "22222222-2222-2222-2222-222222222222",
      amountMinor: 5000,
      commissionBps: 0,
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.value).toHaveLength(1);
    expect(built.value[0]!.amountMinor).toBe(5000);
  });
});

describe("settleDeliveryEarning", () => {
  it("quote yoksa NOT_FOUND döner", async () => {
    const { db } = memoryWalletDb();
    const result = await settleDeliveryEarning(
      { courierId: "c1", shipmentId: "ship-1" },
      db,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });

  it("kazanç + komisyon yazar ve bakiyeyi net verir", async () => {
    const { db, ledger } = memoryWalletDb({ amountMinor: 9000, commissionBps: 1500 });
    const result = await settleDeliveryEarning(
      { courierId: "c1", shipmentId: "ship-1" },
      db,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.created).toBe(true);
    expect(ledger.size).toBe(2);
    expect(result.value.balances.availableMinor).toBe(7650);
  });

  it("ikinci çağrıda yeni satır yazmaz", async () => {
    const { db, ledger } = memoryWalletDb({ amountMinor: 9000, commissionBps: 1500 });
    await settleDeliveryEarning({ courierId: "c1", shipmentId: "ship-1" }, db);
    const again = await settleDeliveryEarning({ courierId: "c1", shipmentId: "ship-1" }, db);
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.value.created).toBe(false);
    expect(ledger.size).toBe(2);
  });
});
