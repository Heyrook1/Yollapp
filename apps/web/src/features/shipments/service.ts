import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  transition,
  type ShipmentStatus,
  err,
  ok,
  type Result,
} from "@yolla/core";
import { prisma, type ShipmentStatus as DbShipmentStatus } from "@yolla/db";
import { quotePrice, type PricingDb, prismaPricingDb } from "@/features/pricing/service";
import type { CreateShipmentInput } from "./schemas";

export type ShipmentRecord = {
  id: string;
  senderId: string;
  status: ShipmentStatus;
  zoneId: string;
  sizeClassId: string;
  isExpress: boolean;
  pickupAddress: string;
  dropoffAddress: string;
  recipientName: string;
  recipientPhone: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PriceQuoteRecord = {
  id: string;
  shipmentId: string;
  amountMinor: number;
  zoneBaseMinor: number;
  sizeMultiplier: number;
  expressPremiumMinor: number;
  commissionBps: number;
};

export type ShipmentsDb = {
  createShipmentWithWindow: (data: {
    senderId: string;
    zoneId: string;
    sizeClassId: string;
    isExpress: boolean;
    pickupAddress: string;
    dropoffAddress: string;
    recipientName: string;
    recipientPhone: string;
    notes: string | null;
    windowStartsAt: Date;
    windowEndsAt: Date;
  }) => Promise<ShipmentRecord>;
  findShipmentById: (id: string) => Promise<ShipmentRecord | null>;
  listBySender: (senderId: string) => Promise<ShipmentRecord[]>;
  updateStatus: (id: string, status: ShipmentStatus) => Promise<ShipmentRecord>;
  upsertQuote: (data: {
    shipmentId: string;
    amountMinor: number;
    zoneBaseMinor: number;
    sizeMultiplier: number;
    expressPremiumMinor: number;
    commissionBps: number;
  }) => Promise<PriceQuoteRecord>;
  createEvent: (data: {
    shipmentId: string;
    fromStatus: ShipmentStatus | null;
    toStatus: ShipmentStatus;
    actorUserId: string | null;
  }) => Promise<void>;
  transaction: <T>(fn: (tx: ShipmentsDb) => Promise<T>) => Promise<T>;
};

function mapStatus(status: DbShipmentStatus): ShipmentStatus {
  return status;
}

export const prismaShipmentsDb: ShipmentsDb = {
  createShipmentWithWindow: async (data) => {
    const created = await prisma.shipment.create({
      data: {
        senderId: data.senderId,
        zoneId: data.zoneId,
        sizeClassId: data.sizeClassId,
        isExpress: data.isExpress,
        pickupAddress: data.pickupAddress,
        dropoffAddress: data.dropoffAddress,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        notes: data.notes,
        status: "DRAFT",
        deliveryWindow: {
          create: {
            startsAt: data.windowStartsAt,
            endsAt: data.windowEndsAt,
          },
        },
        events: {
          create: {
            fromStatus: null,
            toStatus: "DRAFT",
            actorUserId: data.senderId,
          },
        },
      },
    });
    return { ...created, status: mapStatus(created.status) };
  },
  findShipmentById: async (id) => {
    const row = await prisma.shipment.findUnique({ where: { id } });
    return row ? { ...row, status: mapStatus(row.status) } : null;
  },
  listBySender: async (senderId) => {
    const rows = await prisma.shipment.findMany({
      where: { senderId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({ ...row, status: mapStatus(row.status) }));
  },
  updateStatus: async (id, status) => {
    const row = await prisma.shipment.update({
      where: { id },
      data: { status },
    });
    return { ...row, status: mapStatus(row.status) };
  },
  upsertQuote: async (data) => {
    return prisma.priceQuote.upsert({
      where: { shipmentId: data.shipmentId },
      create: data,
      update: {
        amountMinor: data.amountMinor,
        zoneBaseMinor: data.zoneBaseMinor,
        sizeMultiplier: data.sizeMultiplier,
        expressPremiumMinor: data.expressPremiumMinor,
        commissionBps: data.commissionBps,
      },
    });
  },
  createEvent: async (data) => {
    await prisma.shipmentEvent.create({ data });
  },
  transaction: (fn) =>
    prisma.$transaction(async (tx) => {
      const txDb: ShipmentsDb = {
        ...prismaShipmentsDb,
        createShipmentWithWindow: async (data) => {
          const created = await tx.shipment.create({
            data: {
              senderId: data.senderId,
              zoneId: data.zoneId,
              sizeClassId: data.sizeClassId,
              isExpress: data.isExpress,
              pickupAddress: data.pickupAddress,
              dropoffAddress: data.dropoffAddress,
              recipientName: data.recipientName,
              recipientPhone: data.recipientPhone,
              notes: data.notes,
              status: "DRAFT",
              deliveryWindow: {
                create: {
                  startsAt: data.windowStartsAt,
                  endsAt: data.windowEndsAt,
                },
              },
              events: {
                create: {
                  fromStatus: null,
                  toStatus: "DRAFT",
                  actorUserId: data.senderId,
                },
              },
            },
          });
          return { ...created, status: mapStatus(created.status) };
        },
        findShipmentById: async (id) => {
          const row = await tx.shipment.findUnique({ where: { id } });
          return row ? { ...row, status: mapStatus(row.status) } : null;
        },
        updateStatus: async (id, status) => {
          const row = await tx.shipment.update({
            where: { id },
            data: { status },
          });
          return { ...row, status: mapStatus(row.status) };
        },
        upsertQuote: async (data) =>
          tx.priceQuote.upsert({
            where: { shipmentId: data.shipmentId },
            create: data,
            update: {
              amountMinor: data.amountMinor,
              zoneBaseMinor: data.zoneBaseMinor,
              sizeMultiplier: data.sizeMultiplier,
              expressPremiumMinor: data.expressPremiumMinor,
              commissionBps: data.commissionBps,
            },
          }),
        createEvent: async (data) => {
          await tx.shipmentEvent.create({ data });
        },
        listBySender: async (senderId) => {
          const rows = await tx.shipment.findMany({
            where: { senderId },
            orderBy: { createdAt: "desc" },
          });
          return rows.map((row) => ({ ...row, status: mapStatus(row.status) }));
        },
        transaction: (inner) => inner(txDb),
      };
      return fn(txDb);
    }),
};

export type CreateAndQuoteResult = {
  shipment: ShipmentRecord;
  quote: PriceQuoteRecord;
};

export async function createShipmentAndQuote(
  params: { senderId: string; input: CreateShipmentInput },
  deps: { shipments: ShipmentsDb; pricing: PricingDb } = {
    shipments: prismaShipmentsDb,
    pricing: prismaPricingDb,
  },
): Promise<Result<CreateAndQuoteResult>> {
  const priceResult = await quotePrice(
    {
      zoneId: params.input.zoneId,
      sizeClassId: params.input.sizeClassId,
      isExpress: params.input.isExpress,
    },
    deps.pricing,
  );
  if (!priceResult.ok) {
    return priceResult;
  }

  try {
    const result = await deps.shipments.transaction(async (tx) => {
      const shipment = await tx.createShipmentWithWindow({
        senderId: params.senderId,
        zoneId: params.input.zoneId,
        sizeClassId: params.input.sizeClassId,
        isExpress: params.input.isExpress,
        pickupAddress: params.input.pickupAddress,
        dropoffAddress: params.input.dropoffAddress,
        recipientName: params.input.recipientName,
        recipientPhone: params.input.recipientPhone,
        notes: params.input.notes ?? null,
        windowStartsAt: new Date(params.input.windowStartsAt),
        windowEndsAt: new Date(params.input.windowEndsAt),
      });

      const nextStatus = transition(shipment.status, "QUOTE");
      const quoted = await tx.updateStatus(shipment.id, nextStatus);
      await tx.createEvent({
        shipmentId: shipment.id,
        fromStatus: shipment.status,
        toStatus: nextStatus,
        actorUserId: params.senderId,
      });

      const quote = await tx.upsertQuote({
        shipmentId: shipment.id,
        amountMinor: priceResult.value.amountMinor,
        zoneBaseMinor: priceResult.value.zoneBaseMinor,
        sizeMultiplier: priceResult.value.sizeMultiplier,
        expressPremiumMinor: priceResult.value.expressPremiumMinor,
        commissionBps: priceResult.value.commissionBps,
      });

      return { shipment: quoted, quote };
    });
    return ok(result);
  } catch (error) {
    if (error instanceof Error && error.name === "InvalidTransitionError") {
      return err(new ConflictError(error.message));
    }
    throw error;
  }
}

export async function assertSenderOwnsShipment(
  senderId: string,
  shipmentId: string,
  db: ShipmentsDb = prismaShipmentsDb,
): Promise<Result<ShipmentRecord>> {
  const shipment = await db.findShipmentById(shipmentId);
  if (!shipment) {
    return err(new NotFoundError("Shipment not found"));
  }
  if (shipment.senderId !== senderId) {
    return err(new ForbiddenError("Not shipment owner"));
  }
  return ok(shipment);
}

export async function listSenderShipments(
  senderId: string,
  db: ShipmentsDb = prismaShipmentsDb,
): Promise<ShipmentRecord[]> {
  return db.listBySender(senderId);
}
