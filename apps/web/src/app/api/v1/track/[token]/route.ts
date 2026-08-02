import { NextResponse } from "next/server";
import { lookupByTrackingToken } from "@/features/tracking/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { shipmentStatusMeta } from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

const failureStatus = {
  not_found: 404,
  expired: 410,
  revoked: 410,
} as const;

const failureMessage = {
  not_found: "Takip linki geçersiz.",
  expired: "Takip linkinin süresi doldu.",
  revoked: "Takip linki kapatıldı.",
} as const;

/**
 * Herkese açık takip — AUTH YOK.
 *
 * Bu yüzden: IP bazlı hız sınırı (token tarama saldırısına karşı) ve dönen
 * veri sınırlı. Telefon hiç yok; ad ve adres maskeli (CLAUDE.md §6.4).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const headerIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const limit = await checkRateLimit("tracking", headerIp);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla deneme. Lütfen biraz bekleyin." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const { token } = await params;
  const result = await lookupByTrackingToken(token);

  if (!result.ok) {
    return NextResponse.json(
      { error: failureMessage[result.reason] },
      { status: failureStatus[result.reason] },
    );
  }

  const v = result.view;
  return NextResponse.json({
    code: v.code,
    status: v.status,
    statusLabel: shipmentStatusMeta[v.status].label,
    recipientName: v.recipientName,
    pickupArea: v.pickupArea,
    dropoffArea: v.dropoffArea,
    windowLabel: v.windowLabel,
    liveLocationAvailable: v.liveLocationAvailable,
    live: v.live,
    pickup: v.pickup,
    dropoff: v.dropoff,
    routePolyline: v.routePolyline,
    lastUpdatedLabel: v.lastUpdatedLabel,
    events: v.events.map((e) => ({
      toStatus: e.toStatus,
      statusLabel: shipmentStatusMeta[e.toStatus].label,
      timeLabel: e.timeLabel,
    })),
  });
}
