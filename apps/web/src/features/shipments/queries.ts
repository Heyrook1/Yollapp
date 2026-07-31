import { formatTry } from "@yolla/core";
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
    return {
      ...s,
      amountLabel: quote ? formatTry(quote.amountMinor) : null,
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
