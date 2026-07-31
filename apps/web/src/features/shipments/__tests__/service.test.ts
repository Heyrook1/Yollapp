import { describe, expect, it } from "vitest";
import type { PricingDb } from "@/features/pricing/service";
import {
  acceptShipmentJob,
  assertSenderOwnsShipment,
  cancelShipmentAsSender,
  createShipmentAndQuote,
  markShipmentPaid,
  progressShipmentAsCourier,
  type ShipmentsDb,
  type ShipmentRecord,
  type PriceQuoteRecord,
} from "../service";

function createMemoryDeps() {
  const shipments = new Map<string, ShipmentRecord>();
  const quotes = new Map<string, PriceQuoteRecord>();
  const events: Array<{ shipmentId: string; fromStatus: string | null; toStatus: string }> =
    [];
  const approvedCouriers = new Set<string>(["courier-1"]);

  const shipmentsDb: ShipmentsDb = {
    createShipmentWithWindow: async (data) => {
      const now = new Date();
      const record: ShipmentRecord = {
        id: `ship-${shipments.size + 1}`,
        senderId: data.senderId,
        courierId: null,
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
    listAvailableJobs: async () =>
      [...shipments.values()].filter((s) => s.status === "PAID" && !s.courierId),
    listByCourier: async (courierId) =>
      [...shipments.values()].filter((s) => s.courierId === courierId),
    updateStatus: async (id, status) => {
      const existing = shipments.get(id);
      if (!existing) throw new Error("missing");
      const updated = { ...existing, status, updatedAt: new Date() };
      shipments.set(id, updated);
      return updated;
    },
    assignCourier: async (id, courierId, status) => {
      const existing = shipments.get(id);
      if (!existing) throw new Error("missing");
      const updated = {
        ...existing,
        courierId,
        status,
        updatedAt: new Date(),
      };
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
    isApprovedCourier: async (userId) => approvedCouriers.has(userId),
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

  return { shipmentsDb, pricingDb, shipments, quotes, events, approvedCouriers };
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

async function quotedShipment(deps: ReturnType<typeof createMemoryDeps>) {
  await createShipmentAndQuote(
    { senderId: "sender-1", input: sampleInput },
    { shipments: deps.shipmentsDb, pricing: deps.pricingDb },
  );
  return [...deps.shipments.keys()][0]!;
}

describe("createShipmentAndQuote", () => {
  it("DRAFT sonra QUOTED olur ve fiyat snapshot yazar", async () => {
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
  it("başka sender erişemez", async () => {
    const deps = createMemoryDeps();
    const id = await quotedShipment(deps);
    const result = await assertSenderOwnsShipment("sender-2", id, deps.shipmentsDb);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });
});

describe("markShipmentPaid", () => {
  it("QUOTED gönderiyi PAID yapar", async () => {
    const deps = createMemoryDeps();
    const id = await quotedShipment(deps);
    const result = await markShipmentPaid(
      { senderId: "sender-1", shipmentId: id },
      deps.shipmentsDb,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("PAID");
    }
  });
});

describe("acceptShipmentJob", () => {
  it("onaylı kurye PAID işi MATCHED yapar", async () => {
    const deps = createMemoryDeps();
    const id = await quotedShipment(deps);
    await markShipmentPaid({ senderId: "sender-1", shipmentId: id }, deps.shipmentsDb);
    const result = await acceptShipmentJob(
      { courierId: "courier-1", shipmentId: id },
      deps.shipmentsDb,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("MATCHED");
      expect(result.value.courierId).toBe("courier-1");
    }
  });

  it("onaysız kurye kabul edemez", async () => {
    const deps = createMemoryDeps();
    const id = await quotedShipment(deps);
    await markShipmentPaid({ senderId: "sender-1", shipmentId: id }, deps.shipmentsDb);
    const result = await acceptShipmentJob(
      { courierId: "courier-x", shipmentId: id },
      deps.shipmentsDb,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("kurye başkasının MATCHED gönderisini tekrar alamaz", async () => {
    const deps = createMemoryDeps();
    const id = await quotedShipment(deps);
    await markShipmentPaid({ senderId: "sender-1", shipmentId: id }, deps.shipmentsDb);
    await acceptShipmentJob(
      { courierId: "courier-1", shipmentId: id },
      deps.shipmentsDb,
    );
    deps.approvedCouriers.add("courier-2");
    const result = await acceptShipmentJob(
      { courierId: "courier-2", shipmentId: id },
      deps.shipmentsDb,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CONFLICT");
    }
  });
});

async function matchedShipment(deps: ReturnType<typeof createMemoryDeps>) {
  const id = await quotedShipment(deps);
  await markShipmentPaid({ senderId: "sender-1", shipmentId: id }, deps.shipmentsDb);
  await acceptShipmentJob({ courierId: "courier-1", shipmentId: id }, deps.shipmentsDb);
  return id;
}

describe("progressShipmentAsCourier", () => {
  it("atanmış kurye PICK_UP → START_TRANSIT → DELIVER akışını tamamlar ve her adım loglanır", async () => {
    const deps = createMemoryDeps();
    const id = await matchedShipment(deps);

    for (const [event, expected] of [
      ["PICK_UP", "PICKED_UP"],
      ["START_TRANSIT", "IN_TRANSIT"],
      ["DELIVER", "DELIVERED"],
    ] as const) {
      const result = await progressShipmentAsCourier(
        { courierId: "courier-1", shipmentId: id, event },
        deps.shipmentsDb,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe(expected);
      }
    }

    const toStatuses = deps.events.map((e) => e.toStatus);
    expect(toStatuses).toContain("PICKED_UP");
    expect(toStatuses).toContain("IN_TRANSIT");
    expect(toStatuses).toContain("DELIVERED");
  });

  it("atanmamış kurye durumu ilerletemez", async () => {
    const deps = createMemoryDeps();
    const id = await matchedShipment(deps);
    const result = await progressShipmentAsCourier(
      { courierId: "courier-intruder", shipmentId: id, event: "PICK_UP" },
      deps.shipmentsDb,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("geçersiz geçiş (MATCHED + DELIVER) CONFLICT döner", async () => {
    const deps = createMemoryDeps();
    const id = await matchedShipment(deps);
    const result = await progressShipmentAsCourier(
      { courierId: "courier-1", shipmentId: id, event: "DELIVER" },
      deps.shipmentsDb,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CONFLICT");
    }
  });

  it("IN_TRANSIT'te FAIL_DELIVERY teslimat sorununa geçirir", async () => {
    const deps = createMemoryDeps();
    const id = await matchedShipment(deps);
    await progressShipmentAsCourier(
      { courierId: "courier-1", shipmentId: id, event: "PICK_UP" },
      deps.shipmentsDb,
    );
    await progressShipmentAsCourier(
      { courierId: "courier-1", shipmentId: id, event: "START_TRANSIT" },
      deps.shipmentsDb,
    );
    const result = await progressShipmentAsCourier(
      { courierId: "courier-1", shipmentId: id, event: "FAIL_DELIVERY" },
      deps.shipmentsDb,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("FAILED_DELIVERY");
    }
  });
});

describe("cancelShipmentAsSender", () => {
  it("sahibi QUOTED gönderiyi iptal edebilir", async () => {
    const deps = createMemoryDeps();
    const id = await quotedShipment(deps);
    const result = await cancelShipmentAsSender(
      { senderId: "sender-1", shipmentId: id },
      deps.shipmentsDb,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("CANCELLED");
    }
  });

  it("başkasının gönderisi iptal edilemez", async () => {
    const deps = createMemoryDeps();
    const id = await quotedShipment(deps);
    const result = await cancelShipmentAsSender(
      { senderId: "sender-2", shipmentId: id },
      deps.shipmentsDb,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("PICKED_UP sonrası iptal CONFLICT döner", async () => {
    const deps = createMemoryDeps();
    const id = await matchedShipment(deps);
    await progressShipmentAsCourier(
      { courierId: "courier-1", shipmentId: id, event: "PICK_UP" },
      deps.shipmentsDb,
    );
    const result = await cancelShipmentAsSender(
      { senderId: "sender-1", shipmentId: id },
      deps.shipmentsDb,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CONFLICT");
    }
  });
});
