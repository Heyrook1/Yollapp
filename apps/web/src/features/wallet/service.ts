import {
  ConflictError,
  NotFoundError,
  assertEntrySignValid,
  computeWalletBalances,
  splitDeliveryEarning,
  err,
  ok,
  type Result,
  type WalletBalances,
} from "@yolla/core";
import { prisma, type Prisma } from "@yolla/db";

/**
 * Teslimatta defter yazımı (CLAUDE.md §5).
 * Çift kayıt: +DELIVERY_EARNING (brüt) ve −PLATFORM_COMMISSION — net = SUM.
 */

export type LedgerWriteRecord = {
  walletId: string;
  type: "DELIVERY_EARNING" | "PLATFORM_COMMISSION";
  status: "AVAILABLE";
  amountMinor: number;
  shipmentId: string;
  idempotencyKey: string;
  description: string;
  availableAt: Date;
};

export type WalletLedgerDb = {
  ensureWallet: (userId: string) => Promise<{ id: string }>;
  findQuoteByShipmentId: (
    shipmentId: string,
  ) => Promise<{ amountMinor: number; commissionBps: number } | null>;
  hasIdempotencyKey: (key: string) => Promise<boolean>;
  createLedgerEntry: (data: LedgerWriteRecord) => Promise<void>;
};

export function earningIdempotencyKey(shipmentId: string): string {
  return `delivery-earning:${shipmentId}`;
}

export function commissionIdempotencyKey(shipmentId: string): string {
  return `platform-commission:${shipmentId}`;
}

/** Saf: quote'tan yazılacak defter satırlarını üretir (DB yok). */
export function buildDeliverySettlementEntries(params: {
  walletId: string;
  shipmentId: string;
  amountMinor: number;
  commissionBps: number;
  now?: Date;
}): Result<LedgerWriteRecord[]> {
  try {
    const split = splitDeliveryEarning(params.amountMinor, params.commissionBps);
    const now = params.now ?? new Date();
    const earning: LedgerWriteRecord = {
      walletId: params.walletId,
      type: "DELIVERY_EARNING",
      status: "AVAILABLE",
      amountMinor: split.grossMinor,
      shipmentId: params.shipmentId,
      idempotencyKey: earningIdempotencyKey(params.shipmentId),
      description: `Teslimat kazancı · ${params.shipmentId.slice(0, 8)}`,
      availableAt: now,
    };
    assertEntrySignValid(earning);

    // Komisyon 0 ise satır yazılmaz (amount=0 DB CHECK'i kırar).
    if (split.commissionMinor === 0) {
      return ok([earning]);
    }

    const commission: LedgerWriteRecord = {
      walletId: params.walletId,
      type: "PLATFORM_COMMISSION",
      status: "AVAILABLE",
      amountMinor: -split.commissionMinor,
      shipmentId: params.shipmentId,
      idempotencyKey: commissionIdempotencyKey(params.shipmentId),
      description: `Platform komisyonu · ${params.shipmentId.slice(0, 8)}`,
      availableAt: now,
    };
    assertEntrySignValid(commission);
    return ok([earning, commission]);
  } catch (error) {
    return err(
      new ConflictError(
        error instanceof Error ? error.message : "Defter satırı üretilemedi",
      ),
    );
  }
}

/**
 * DELIVER sonrası çağrılır. Aynı TX içinde olmalı.
 * Idempotent: satırlar zaten varsa no-op success.
 */
export async function settleDeliveryEarning(
  params: { courierId: string; shipmentId: string },
  db: WalletLedgerDb,
): Promise<Result<{ created: boolean; balances: WalletBalances }>> {
  const quote = await db.findQuoteByShipmentId(params.shipmentId);
  if (!quote) {
    return err(new NotFoundError("Price quote not found for settlement"));
  }

  const already = await db.hasIdempotencyKey(earningIdempotencyKey(params.shipmentId));
  if (already) {
    return ok({
      created: false,
      balances: computeWalletBalances([]),
    });
  }

  const wallet = await db.ensureWallet(params.courierId);
  const built = buildDeliverySettlementEntries({
    walletId: wallet.id,
    shipmentId: params.shipmentId,
    amountMinor: quote.amountMinor,
    commissionBps: quote.commissionBps,
  });
  if (!built.ok) {
    return built;
  }

  for (const entry of built.value) {
    // Yarış: ikinci yazım unique ihlali → idempotent kabul.
    const exists = await db.hasIdempotencyKey(entry.idempotencyKey);
    if (exists) continue;
    await db.createLedgerEntry(entry);
  }

  const split = splitDeliveryEarning(quote.amountMinor, quote.commissionBps);
  const synthetic = [
    {
      type: "DELIVERY_EARNING" as const,
      status: "AVAILABLE" as const,
      amountMinor: split.grossMinor,
    },
    ...(split.commissionMinor > 0
      ? [
          {
            type: "PLATFORM_COMMISSION" as const,
            status: "AVAILABLE" as const,
            amountMinor: -split.commissionMinor,
          },
        ]
      : []),
  ];

  return ok({ created: true, balances: computeWalletBalances(synthetic) });
}

function createWalletLedgerDb(
  client: {
    wallet: {
      upsert: (args: Prisma.WalletUpsertArgs) => Promise<{ id: string }>;
    };
    priceQuote: {
      findUnique: (args: {
        where: { shipmentId: string };
        select: { amountMinor: true; commissionBps: true };
      }) => Promise<{ amountMinor: number; commissionBps: number } | null>;
    };
    ledgerEntry: {
      findUnique: (args: {
        where: { idempotencyKey: string };
        select: { id: true };
      }) => Promise<{ id: string } | null>;
      create: (args: Prisma.LedgerEntryCreateArgs) => Promise<unknown>;
    };
  },
): WalletLedgerDb {
  return {
    ensureWallet: async (userId) =>
      client.wallet.upsert({
        where: { userId },
        create: { userId },
        update: {},
        select: { id: true },
      }),
    findQuoteByShipmentId: async (shipmentId) =>
      client.priceQuote.findUnique({
        where: { shipmentId },
        select: { amountMinor: true, commissionBps: true },
      }),
    hasIdempotencyKey: async (key) => {
      const row = await client.ledgerEntry.findUnique({
        where: { idempotencyKey: key },
        select: { id: true },
      });
      return row !== null;
    },
    createLedgerEntry: async (data) => {
      await client.ledgerEntry.create({
        data: {
          walletId: data.walletId,
          type: data.type,
          status: data.status,
          amountMinor: data.amountMinor,
          shipmentId: data.shipmentId,
          idempotencyKey: data.idempotencyKey,
          description: data.description,
          availableAt: data.availableAt,
        },
      });
    },
  };
}

export const prismaWalletLedgerDb: WalletLedgerDb = createWalletLedgerDb(prisma as never);

/** Prisma transaction client ile aynı TX içinde settle için. */
export function walletLedgerDbFromClient(tx: unknown): WalletLedgerDb {
  return createWalletLedgerDb(tx as never);
}

export async function listCourierLedgerEntries(courierUserId: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId: courierUserId },
    include: {
      entries: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!wallet) {
    return { walletId: null as string | null, entries: [], balances: computeWalletBalances([]) };
  }
  const balances = computeWalletBalances(
    wallet.entries.map((e) => ({
      type: e.type,
      status: e.status,
      amountMinor: e.amountMinor,
    })),
  );
  return { walletId: wallet.id, entries: wallet.entries, balances };
}
