import { prisma } from "@yolla/db";
import { requireAuth } from "@/lib/auth";
import { listSenderShipments, type ShipmentRecord } from "./service";
import { formatTry } from "@yolla/core";

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

export async function queryMyShipments(): Promise<
  Array<
    ShipmentRecord & {
      amountLabel: string | null;
      zoneName: string;
      sizeName: string;
    }
  >
> {
  const session = await requireAuth();
  const shipments = await listSenderShipments(session.dbUser.id);
  if (shipments.length === 0) {
    return [];
  }

  const ids = shipments.map((s) => s.id);
  const [quotes, zones, sizes] = await Promise.all([
    prisma.priceQuote.findMany({ where: { shipmentId: { in: ids } } }),
    prisma.zone.findMany(),
    prisma.sizeClass.findMany(),
  ]);

  const quoteByShipment = new Map(quotes.map((q) => [q.shipmentId, q]));
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const sizeById = new Map(sizes.map((s) => [s.id, s]));

  return shipments.map((s) => {
    const quote = quoteByShipment.get(s.id);
    return {
      ...s,
      amountLabel: quote ? formatTry(quote.amountMinor) : null,
      zoneName: zoneById.get(s.zoneId)?.name ?? s.zoneId,
      sizeName: sizeById.get(s.sizeClassId)?.name ?? s.sizeClassId,
    };
  });
}
