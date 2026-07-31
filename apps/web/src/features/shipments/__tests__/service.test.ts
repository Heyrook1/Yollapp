import { describe, expect, it } from "vitest";
import type { PricingDb } from "@/features/pricing/service";
import {
  assertSenderOwnsShipment,
  createShipmentAndQuote,
  type ShipmentsDb,
  type ShipmentRecord,
  type PriceQuoteRecord,
} from "../service";

function createMemoryDeps() {
  const shipments = new Map<string, ShipmentRecord>();
  const quotes = new Map<string, PriceQuoteRecord>();
  const events: Array<{ shipmentId: string; fromStatus: string | null; toStatus: string }> =
    [];

  const shipmentsDb: ShipmentsDb = {
    createShipmentWithWindow: async (data) => {
      const now = new Date();
      const record: ShipmentRecord = {
        id: `ship-${shipments.size + 1}`,
        senderId: data.senderId,
        status: "DRAFT",
        zoneId: data.zoneId,
        sizeClassId: data.sizeClassId,
        isExpress: data.isExpress,
        pickupAddress: data.pickupAddress,
        dropoffAddress: data.dropoffAddress,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
      };
      shipments.set(record.id, record);
      return record;
    },
    findShipmentById: async (id) => shipments.get(id) ?? null,
    listBySender: async (senderId) =>
      [...shipments.values()].filter((s) => s.senderId === senderId),
    updateStatus: async (id, status) => {
      const existing = shipments.get(id);
      if (!existing) throw new Error("missing");
      const updated = { ...existing, status, updatedAt: new Date() };
      shipments.set(id, updated);
      return updated;
    },
    upsertQuote: async (data) => {
      const record: PriceQuoteRecord = {
        id: `quote-${quotes.size + 1}`,
        ...data,
      };
      quotes.set(data.shipmentId, record);
      return record;
    },
    createEvent: async (data) => {
      events.push(data);
    },
    transaction: async (fn) => fn(shipmentsDb),
  };

  const pricingDb: PricingDb = {
    findActiveZone: async () => ({ id: "zone-1", baseFeeMinor: 5000, isActive: true }),
    findActiveSizeClass: async () => ({
      id: "size-m",
      multiplier: 1.5,
      isActive: true,
    }),
    getPlatformConfig: async () => ({
      commissionBps: 1500,
      expressPremiumBps: 5000,
    }),
  };

  return { shipmentsDb, pricingDb, shipments, quotes, events };
}

const sampleInput = {
  zoneId: "zone-1",
  sizeClassId: "size-m",
  isExpress: false,
  pickupAddress: "Lefkoşa Merkez 1",
  dropoffAddress: "Girne Liman 2",
  recipientName: "Ali Veli",
  recipientPhone: "+905331112233",
  windowStartsAt: new Date("2026-08-01T10:00:00.000Z").toISOString(),
  windowEndsAt: new Date("2026-08-01T12:00:00.000Z").toISOString(),
};

describe("createShipmentAndQuote", () => {
  it("creates DRAFT then transitions to QUOTED with snapshot", async () => {
    const deps = createMemoryDeps();
    const result = await createShipmentAndQuote(
      { senderId: "sender-1", input: sampleInput },
      { shipments: deps.shipmentsDb, pricing: deps.pricingDb },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.shipment.status).toBe("QUOTED");
      expect(result.value.quote.amountMinor).toBe(7500);
    }
    expect(deps.events.some((e) => e.toStatus === "QUOTED")).toBe(true);
  });
});

describe("assertSenderOwnsShipment", () => {
  it("forbids other senders", async () => {
    const deps = createMemoryDeps();
    await createShipmentAndQuote(
      { senderId: "sender-1", input: sampleInput },
      { shipments: deps.shipmentsDb, pricing: deps.pricingDb },
    );
    const id = [...deps.shipments.keys()][0]!;
    const result = await assertSenderOwnsShipment("sender-2", id, deps.shipmentsDb);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });
});
