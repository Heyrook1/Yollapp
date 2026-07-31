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
import {
  CourierStatus,
  prisma,
  type Prisma,
  type ShipmentStatus as DbShipmentStatus,
} from "@yolla/db";
import { quotePrice, type PricingDb, prismaPricingDb } from "@/features/pricing/service";
import type { CreateShipmentInput } from "./schemas";

export type ShipmentRecord = {
  id: string;
  senderId: string;
  courierId: string | null;
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

type ShipmentRow = {
  id: string;
  senderId: string;
  courierId: string | null;
  status: DbShipmentStatus;
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
  listAvailableJobs: () => Promise<ShipmentRecord[]>;
  listByCourier: (courierId: string) => Promise<ShipmentRecord[]>;
  updateStatus: (id: string, status: ShipmentStatus) => Promise<ShipmentRecord>;
  assignCourier: (
    id: string,
    courierId: string,
    status: ShipmentStatus,
  ) => Promise<ShipmentRecord>;
  /**
   * Atomik atama: yalnızca gönderi hâlâ PAID ve kuryesizse yazar.
   * Eşzamanlı iki kabulde ikincisi 0 satır günceller — çift atama imkânsız.
   */
  assignCourierIfAvailable: (
    id: string,
    courierId: string,
    status: ShipmentStatus,
  ) => Promise<number>;
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
  isApprovedCourier: (userId: string) => Promise<boolean>;
  transaction: <T>(fn: (tx: ShipmentsDb) => Promise<T>) => Promise<T>;
};

function toRecord(row: ShipmentRow): ShipmentRecord {
  return { ...row, status: row.status };
}

function createShipmentsDb(
  client: {
    shipment: {
      create: (args: Prisma.ShipmentCreateArgs) => Promise<ShipmentRow>;
      findUnique: (args: {
        where: { id: string };
      }) => Promise<ShipmentRow | null>;
      findMany: (args: Prisma.ShipmentFindManyArgs) => Promise<ShipmentRow[]>;
      update: (args: Prisma.ShipmentUpdateArgs) => Promise<ShipmentRow>;
      updateMany: (args: Prisma.ShipmentUpdateManyArgs) => Promise<{ count: number }>;
    };
    priceQuote: {
      upsert: (args: Prisma.PriceQuoteUpsertArgs) => Promise<PriceQuoteRecord>;
    };
    shipmentEvent: {
      create: (args: Prisma.ShipmentEventCreateArgs) => Promise<unknown>;
    };
    courierProfile: {
      findUnique: (args: {
        where: { userId: string };
        select: { status: true };
      }) => Promise<{ status: CourierStatus } | null>;
    };
  },
  runTransaction?: <T>(fn: (tx: ShipmentsDb) => Promise<T>) => Promise<T>,
): ShipmentsDb {
  const db: ShipmentsDb = {
    createShipmentWithWindow: async (data) => {
      const created = await client.shipment.create({
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
      return toRecord(created);
    },
    findShipmentById: async (id) => {
      const row = await client.shipment.findUnique({ where: { id } });
      return row ? toRecord(row) : null;
    },
    listBySender: async (senderId) => {
      const rows = await client.shipment.findMany({
        where: { senderId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toRecord);
    },
    listAvailableJobs: async () => {
      const rows = await client.shipment.findMany({
        where: { status: "PAID", courierId: null },
        orderBy: [{ isExpress: "desc" }, { createdAt: "asc" }],
      });
      return rows.map(toRecord);
    },
    listByCourier: async (courierId) => {
      const rows = await client.shipment.findMany({
        where: { courierId },
        orderBy: { updatedAt: "desc" },
      });
      return rows.map(toRecord);
    },
    updateStatus: async (id, status) => {
      const row = await client.shipment.update({
        where: { id },
        data: { status },
      });
      return toRecord(row);
    },
    assignCourier: async (id, courierId, status) => {
      const row = await client.shipment.update({
        where: { id },
        data: { courierId, status },
      });
      return toRecord(row);
    },
    assignCourierIfAvailable: async (id, courierId, status) => {
      // Koşul yazımın parçası: eşzamanlı ikinci kabul 0 satır günceller.
      const result = await client.shipment.updateMany({
        where: { id, status: "PAID", courierId: null },
        data: { courierId, status },
      });
      return result.count;
    },
    upsertQuote: async (data) =>
      client.priceQuote.upsert({
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
      await client.shipmentEvent.create({ data });
    },
    isApprovedCourier: async (userId) => {
      const profile = await client.courierProfile.findUnique({
        where: { userId },
        select: { status: true },
      });
      return profile?.status === CourierStatus.APPROVED;
    },
    transaction: async (fn) => {
      if (runTransaction) {
        return runTransaction(fn);
      }
      return fn(db);
    },
  };
  return db;
}

export const prismaShipmentsDb: ShipmentsDb = createShipmentsDb(
  prisma as never,
  (fn) =>
    prisma.$transaction(async (tx) => {
      const txDb = createShipmentsDb(tx as never);
      return fn(txDb);
    }),
);

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

/** Mock/manual payment until a payment provider is wired. */
export async function markShipmentPaid(
  params: { senderId: string; shipmentId: string },
  db: ShipmentsDb = prismaShipmentsDb,
): Promise<Result<ShipmentRecord>> {
  const owned = await assertSenderOwnsShipment(params.senderId, params.shipmentId, db);
  if (!owned.ok) {
    return owned;
  }

  try {
    const nextStatus = transition(owned.value.status, "PAY");
    return await db.transaction(async (tx) => {
      const paid = await tx.updateStatus(owned.value.id, nextStatus);
      await tx.createEvent({
        shipmentId: owned.value.id,
        fromStatus: owned.value.status,
        toStatus: nextStatus,
        actorUserId: params.senderId,
      });
      return ok(paid);
    });
  } catch (error) {
    if (error instanceof Error && error.name === "InvalidTransitionError") {
      return err(new ConflictError(error.message));
    }
    throw error;
  }
}

export async function acceptShipmentJob(
  params: { courierId: string; shipmentId: string },
  db: ShipmentsDb = prismaShipmentsDb,
): Promise<Result<ShipmentRecord>> {
  const approved = await db.isApprovedCourier(params.courierId);
  if (!approved) {
    return err(new ForbiddenError("Courier not approved"));
  }

  const shipment = await db.findShipmentById(params.shipmentId);
  if (!shipment) {
    return err(new NotFoundError("Shipment not found"));
  }
  if (shipment.courierId) {
    return err(new ConflictError("Shipment already matched"));
  }

  // Kurye kendi gönderisini taşıyamaz (çıkar çatışması / komisyon manipülasyonu).
  if (shipment.senderId === params.courierId) {
    return err(new ForbiddenError("Kendi gönderinizi kurye olarak alamazsınız."));
  }

  try {
    const nextStatus = transition(shipment.status, "MATCH");
    return await db.transaction(async (tx) => {
      // Atomik koşullu yazım: "önce oku sonra yaz" yarışı burada kapanır.
      // Eşzamanlı ikinci kabul 0 satır günceller ve CONFLICT alır.
      const updated = await tx.assignCourierIfAvailable(
        params.shipmentId,
        params.courierId,
        nextStatus,
      );
      if (updated === 0) {
        return err(new ConflictError("Shipment no longer available"));
      }

      const matched = await tx.findShipmentById(params.shipmentId);
      if (!matched) {
        return err(new NotFoundError("Shipment not found"));
      }
      await tx.createEvent({
        shipmentId: matched.id,
        fromStatus: "PAID",
        toStatus: nextStatus,
        actorUserId: params.courierId,
      });
      return ok(matched);
    });
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

export async function listAvailableJobs(
  db: ShipmentsDb = prismaShipmentsDb,
): Promise<ShipmentRecord[]> {
  return db.listAvailableJobs();
}

export async function listCourierJobs(
  courierId: string,
  db: ShipmentsDb = prismaShipmentsDb,
): Promise<ShipmentRecord[]> {
  return db.listByCourier(courierId);
}

/** Kurye görev ilerletme olayları — yalnızca atanmış kurye tetikleyebilir. */
export type CourierProgressEvent = "PICK_UP" | "START_TRANSIT" | "DELIVER" | "FAIL_DELIVERY";

export async function progressShipmentAsCourier(
  params: {
    courierId: string;
    shipmentId: string;
    event: CourierProgressEvent;
  },
  db: ShipmentsDb = prismaShipmentsDb,
): Promise<Result<ShipmentRecord>> {
  const shipment = await db.findShipmentById(params.shipmentId);
  if (!shipment) {
    return err(new NotFoundError("Shipment not found"));
  }
  if (shipment.courierId !== params.courierId) {
    return err(new ForbiddenError("Not assigned courier"));
  }

  try {
    return await db.transaction(async (tx) => {
      const fresh = await tx.findShipmentById(params.shipmentId);
      if (!fresh || fresh.courierId !== params.courierId) {
        return err(new ConflictError("Shipment no longer assigned"));
      }
      const nextStatus = transition(fresh.status, params.event);
      const updated = await tx.updateStatus(fresh.id, nextStatus);
      await tx.createEvent({
        shipmentId: fresh.id,
        fromStatus: fresh.status,
        toStatus: nextStatus,
        actorUserId: params.courierId,
      });
      return ok(updated);
    });
  } catch (error) {
    if (error instanceof Error && error.name === "InvalidTransitionError") {
      return err(new ConflictError(error.message));
    }
    throw error;
  }
}

export async function cancelShipmentAsSender(
  params: { senderId: string; shipmentId: string },
  db: ShipmentsDb = prismaShipmentsDb,
): Promise<Result<ShipmentRecord>> {
  const owned = await assertSenderOwnsShipment(params.senderId, params.shipmentId, db);
  if (!owned.ok) {
    return owned;
  }

  try {
    return await db.transaction(async (tx) => {
      const fresh = await tx.findShipmentById(params.shipmentId);
      if (!fresh) {
        return err(new NotFoundError("Shipment not found"));
      }
      const nextStatus = transition(fresh.status, "CANCEL");
      const cancelled = await tx.updateStatus(fresh.id, nextStatus);
      await tx.createEvent({
        shipmentId: fresh.id,
        fromStatus: fresh.status,
        toStatus: nextStatus,
        actorUserId: params.senderId,
      });
      return ok(cancelled);
    });
  } catch (error) {
    if (error instanceof Error && error.name === "InvalidTransitionError") {
      return err(new ConflictError(error.message));
    }
    throw error;
  }
}
