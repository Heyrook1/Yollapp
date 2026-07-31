import { formatTry, multiplyMinor, type ShipmentStatus as DbShipmentStatusName } from "@yolla/core";
import { AppRole, prisma } from "@yolla/db";
import { requireAuth } from "@/lib/auth";
import { assertRole } from "@/lib/authorization";
import {
  listAvailableJobs,
  listCourierJobs,
  listSenderShipments,
  type ShipmentRecord,
} from "./service";

export async function queryCatalog() {
  const [zones, sizeClasses] = await Promise.all([
    prisma.zone.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.sizeClass.findMany({
      where: { isActive: true },
      orderBy: { multiplier: "asc" },
    }),
  ]);
  return { zones, sizeClasses };
}

async function enrichShipments(shipments: ShipmentRecord[]) {
  if (shipments.length === 0) {
    return [];
  }

  const ids = shipments.map((s) => s.id);
  const [quotes, zones, sizes, windows] = await Promise.all([
    prisma.priceQuote.findMany({ where: { shipmentId: { in: ids } } }),
    prisma.zone.findMany(),
    prisma.sizeClass.findMany(),
    prisma.deliveryWindow.findMany({ where: { shipmentId: { in: ids } } }),
  ]);

  const quoteByShipment = new Map(quotes.map((q) => [q.shipmentId, q]));
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const sizeById = new Map(sizes.map((s) => [s.id, s]));
  const windowByShipment = new Map(windows.map((w) => [w.shipmentId, w]));

  const fmt = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Nicosia",
    dateStyle: "short",
    timeStyle: "short",
  });

  return shipments.map((s) => {
    const quote = quoteByShipment.get(s.id);
    const window = windowByShipment.get(s.id);
    const netMinor = quote
      ? quote.amountMinor - multiplyMinor(quote.amountMinor, quote.commissionBps / 10_000)
      : null;
    return {
      ...s,
      amountLabel: quote ? formatTry(quote.amountMinor) : null,
      // Kurye net kazancı = brüt − kaynakta kesilen komisyon
      netAmountLabel: netMinor !== null ? formatTry(netMinor) : null,
      commissionLabel:
        quote && netMinor !== null ? formatTry(quote.amountMinor - netMinor) : null,
      zoneName: zoneById.get(s.zoneId)?.name ?? s.zoneId,
      sizeName: sizeById.get(s.sizeClassId)?.name ?? s.sizeClassId,
      windowLabel: window
        ? `${fmt.format(window.startsAt)} – ${fmt.format(window.endsAt)}`
        : null,
    };
  });
}

export async function queryMyShipments() {
  const session = await requireAuth();
  const shipments = await listSenderShipments(session.dbUser.id);
  return enrichShipments(shipments);
}

export async function queryAvailableJobs() {
  const session = await requireAuth();
  assertRole(session, AppRole.COURIER);
  const jobs = await listAvailableJobs();
  return enrichShipments(jobs);
}

export async function queryMyCourierJobs() {
  const session = await requireAuth();
  assertRole(session, AppRole.COURIER);
  const jobs = await listCourierJobs(session.dbUser.id);
  return enrichShipments(jobs);
}

const nicosiaDateTime = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Nicosia",
  dateStyle: "short",
  timeStyle: "short",
});

const nicosiaTime = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Nicosia",
  hour: "2-digit",
  minute: "2-digit",
});

/** Gönderi detayı — sahiplik: gönderici, atanmış kurye ya da admin. */
export async function queryShipmentDetail(shipmentId: string) {
  const session = await requireAuth();

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      priceQuote: true,
      deliveryWindow: true,
      zone: true,
      sizeClass: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!shipment) {
    return null;
  }

  const isSender = shipment.senderId === session.dbUser.id;
  const isCourier = shipment.courierId === session.dbUser.id;
  const isAdmin = session.dbUser.roles.includes(AppRole.ADMIN);
  if (!isSender && !isCourier && !isAdmin) {
    // "URL'i bilen erişir" yasak — sahiplik yoksa kayıt yok gibi davran.
    return null;
  }

  return {
    id: shipment.id,
    status: shipment.status,
    isExpress: shipment.isExpress,
    pickupAddress: shipment.pickupAddress,
    dropoffAddress: shipment.dropoffAddress,
    recipientName: shipment.recipientName,
    recipientPhone: shipment.recipientPhone,
    notes: shipment.notes,
    zoneName: shipment.zone.name,
    sizeName: shipment.sizeClass.name,
    createdAt: shipment.createdAt,
    viewer: isSender ? ("sender" as const) : isCourier ? ("courier" as const) : ("admin" as const),
    amountLabel: shipment.priceQuote ? formatTry(shipment.priceQuote.amountMinor) : null,
    quote: shipment.priceQuote
      ? {
          amountMinor: shipment.priceQuote.amountMinor,
          zoneBaseMinor: shipment.priceQuote.zoneBaseMinor,
          expressPremiumMinor: shipment.priceQuote.expressPremiumMinor,
          commissionBps: shipment.priceQuote.commissionBps,
        }
      : null,
    window: shipment.deliveryWindow
      ? {
          startsAt: shipment.deliveryWindow.startsAt,
          endsAt: shipment.deliveryWindow.endsAt,
          label: `${nicosiaDateTime.format(shipment.deliveryWindow.startsAt)} – ${nicosiaTime.format(shipment.deliveryWindow.endsAt)}`,
          endTimeLabel: nicosiaTime.format(shipment.deliveryWindow.endsAt),
        }
      : null,
    events: shipment.events.map((e) => ({
      id: e.id,
      toStatus: e.toStatus,
      timeLabel: nicosiaDateTime.format(e.createdAt),
    })),
  };
}

export type ShipmentDetail = NonNullable<Awaited<ReturnType<typeof queryShipmentDetail>>>;

function commissionOf(amountMinor: number, commissionBps: number): number {
  // Yuvarlama tek yerde: packages/core/money.ts
  return multiplyMinor(amountMinor, commissionBps / 10_000);
}

/** Kurye kazançları — DELIVERED gönderilerin quote'larından gerçek veriyle türetilir. */
export async function queryCourierWallet() {
  const session = await requireAuth();
  assertRole(session, AppRole.COURIER);

  const jobs = await prisma.shipment.findMany({
    where: { courierId: session.dbUser.id },
    include: { priceQuote: true },
    orderBy: { updatedAt: "desc" },
  });

  const config = await prisma.platformConfig.findUnique({ where: { id: "default" } });
  const commissionBps = config?.commissionBps ?? 1500;

  let availableMinor = 0;
  let pendingMinor = 0;
  const entries: {
    id: string;
    title: string;
    detail: string;
    amountMinor: number;
    amountLabel: string;
    positive: boolean;
    settled: boolean;
  }[] = [];

  for (const job of jobs) {
    if (!job.priceQuote) continue;
    const gross = job.priceQuote.amountMinor;
    const commission = commissionOf(gross, job.priceQuote.commissionBps);
    const net = gross - commission;
    const active = ["MATCHED", "PICKED_UP", "IN_TRANSIT"].includes(job.status);
    if (job.status === "DELIVERED") {
      availableMinor += net;
    } else if (active) {
      pendingMinor += net;
    } else {
      continue;
    }
    entries.push({
      id: job.id,
      title: `Teslimat · ${job.id.slice(0, 8).toUpperCase()}`,
      detail: `${nicosiaDateTime.format(job.updatedAt)} · brüt ${formatTry(gross)} − komisyon ${formatTry(commission)}`,
      amountMinor: net,
      amountLabel: formatTry(net),
      positive: true,
      settled: job.status === "DELIVERED",
    });
  }

  return {
    availableMinor,
    availableLabel: formatTry(availableMinor),
    pendingMinor,
    pendingLabel: formatTry(pendingMinor),
    commissionBps,
    commissionPctLabel: `%${(commissionBps / 100).toLocaleString("tr-TR")}`,
    deliveredCount: jobs.filter((j) => j.status === "DELIVERED").length,
    entries,
  };
}

/** Gönderici ödeme geçmişi — ödenmiş quote'lardan gerçek veriyle. */
export async function querySenderWallet() {
  const session = await requireAuth();

  const shipments = await prisma.shipment.findMany({
    where: {
      senderId: session.dbUser.id,
      status: { notIn: ["DRAFT", "QUOTED", "CANCELLED"] },
    },
    include: { priceQuote: true },
    orderBy: { updatedAt: "desc" },
  });

  let totalMinor = 0;
  const entries = shipments
    .filter((s) => s.priceQuote)
    .map((s) => {
      totalMinor += s.priceQuote!.amountMinor;
      return {
        id: s.id,
        title: `Gönderi · ${s.id.slice(0, 8).toUpperCase()}`,
        detail: nicosiaDateTime.format(s.updatedAt),
        amountLabel: formatTry(s.priceQuote!.amountMinor),
        status: s.status,
      };
    });

  return { totalLabel: formatTry(totalMinor), count: entries.length, entries };
}

/** Admin operasyon özeti — gerçek sayımlar. */
export async function queryAdminOverview() {
  const session = await requireAuth();
  assertRole(session, AppRole.ADMIN);

  const [statusGroups, pendingCouriers, approvedCouriers, recent] = await Promise.all([
    prisma.shipment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.courierProfile.count({ where: { status: "PENDING" } }),
    prisma.courierProfile.count({ where: { status: "APPROVED" } }),
    prisma.shipment.findMany({
      orderBy: { updatedAt: "desc" },
      take: 12,
      include: { priceQuote: true, zone: true },
    }),
  ]);

  const counts = new Map(statusGroups.map((g) => [g.status, g._count._all]));
  const count = (s: DbShipmentStatusName) => counts.get(s) ?? 0;
  const delivered = count("DELIVERED");
  const failed = count("FAILED_DELIVERY") + count("RETURNED");
  const finished = delivered + failed;

  return {
    active:
      count("PAID") + count("MATCHED") + count("PICKED_UP") + count("IN_TRANSIT"),
    matchingQueue: count("PAID"),
    inTransit: count("PICKED_UP") + count("IN_TRANSIT"),
    awaitingPayment: count("QUOTED"),
    delivered,
    failed,
    successRateLabel:
      finished > 0 ? `%${Math.round((delivered / finished) * 100)}` : "—",
    pendingCouriers,
    approvedCouriers,
    recent: recent.map((s) => ({
      id: s.id,
      code: s.id.slice(0, 8).toUpperCase(),
      status: s.status,
      zoneName: s.zone.name,
      amountLabel: s.priceQuote ? formatTry(s.priceQuote.amountMinor) : "—",
      updatedLabel: nicosiaDateTime.format(s.updatedAt),
    })),
  };
}
