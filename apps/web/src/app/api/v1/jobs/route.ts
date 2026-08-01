import { NextResponse } from "next/server";
import { formatTry, multiplyMinor } from "@yolla/core";
import { prisma } from "@yolla/db";
import { accountStateFor, authenticateRequest, toApiResponse } from "@/lib/api-auth";
import { assertCan } from "@/lib/authz";
import { listAvailableJobs, listCourierJobs } from "@/features/shipments/service";
import { shipmentStatusMeta } from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

/**
 * Kurye işleri.
 * ?mine=1 → üzerimdeki işler, aksi halde açık iş havuzu.
 *
 * Net kazanç sunucuda hesaplanır — kurye kartta ne alacağını 3 saniyede görmeli.
 */
export async function GET(request: Request) {
  try {
    const session = await authenticateRequest(request);
    const state = await accountStateFor(session);
    assertCan(state, "courier:accept_job");

    const url = new URL(request.url);
    const mine = url.searchParams.get("mine") === "1";

    const shipments = mine
      ? await listCourierJobs(session.dbUser.id)
      : await listAvailableJobs();

    if (shipments.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    const ids = shipments.map((s) => s.id);
    const [quotes, zones, sizes, windows] = await Promise.all([
      prisma.priceQuote.findMany({ where: { shipmentId: { in: ids } } }),
      prisma.zone.findMany(),
      prisma.sizeClass.findMany(),
      prisma.deliveryWindow.findMany({ where: { shipmentId: { in: ids } } }),
    ]);

    const quoteBy = new Map(quotes.map((q) => [q.shipmentId, q]));
    const zoneBy = new Map(zones.map((z) => [z.id, z]));
    const sizeBy = new Map(sizes.map((s) => [s.id, s]));
    const windowBy = new Map(windows.map((w) => [w.shipmentId, w]));
    const fmt = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Nicosia",
      dateStyle: "short",
      timeStyle: "short",
    });

    return NextResponse.json({
      jobs: shipments
        // Kurye kendi gönderisini alamaz — havuzda hiç gösterme.
        .filter((s) => mine || s.senderId !== session.dbUser.id)
        .map((s) => {
          const quote = quoteBy.get(s.id);
          const commission = quote
            ? multiplyMinor(quote.amountMinor, quote.commissionBps / 10_000)
            : 0;
          const net = quote ? quote.amountMinor - commission : null;
          const w = windowBy.get(s.id);
          return {
            id: s.id,
            code: s.id.slice(0, 8).toUpperCase(),
            status: s.status,
            statusLabel: shipmentStatusMeta[s.status].label,
            pickupAddress: s.pickupAddress,
            dropoffAddress: s.dropoffAddress,
            recipientName: s.recipientName,
            recipientPhone: mine ? s.recipientPhone : null,
            notes: mine ? s.notes : null,
            zoneName: zoneBy.get(s.zoneId)?.name ?? "",
            sizeName: sizeBy.get(s.sizeClassId)?.name ?? "",
            isExpress: s.isExpress,
            grossLabel: quote ? formatTry(quote.amountMinor) : null,
            commissionLabel: quote ? formatTry(commission) : null,
            netLabel: net !== null ? formatTry(net) : null,
            windowLabel: w ? `${fmt.format(w.startsAt)} – ${fmt.format(w.endsAt)}` : null,
          };
        }),
    });
  } catch (error) {
    return toApiResponse(error);
  }
}
