import { NextResponse } from "next/server";
import { formatTry } from "@yolla/core";
import { ZodError } from "zod";
import { accountStateFor, authenticateRequest, toApiResponse } from "@/lib/api-auth";
import { assertCan } from "@/lib/authz";
import { assertFeatureEnabled } from "@/lib/flags";
import { checkRateLimit } from "@/lib/rate-limit";
import { createShipmentSchema } from "@/features/shipments/schemas";
import { createShipmentAndQuote, listSenderShipments } from "@/features/shipments/service";
import { shipmentStatusMeta } from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

/**
 * Gönderi listesi ve oluşturma — mobil istemci için.
 *
 * Web'deki server action'larla AYNI servis katmanını kullanır; iş mantığı
 * ikinci kez yazılmaz (CLAUDE.md §3). Yetki, kill switch ve hız sınırı
 * burada da iş mantığından ÖNCE çalışır.
 */

export async function GET(request: Request) {
  try {
    const session = await authenticateRequest(request);
    const shipments = await listSenderShipments(session.dbUser.id);

    return NextResponse.json({
      shipments: shipments.map((s) => ({
        id: s.id,
        code: s.id.slice(0, 8).toUpperCase(),
        status: s.status,
        statusLabel: shipmentStatusMeta[s.status].label,
        pickupAddress: s.pickupAddress,
        dropoffAddress: s.dropoffAddress,
        recipientName: s.recipientName,
        isExpress: s.isExpress,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return toApiResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await authenticateRequest(request);
    await assertFeatureEnabled("shipment_creation");

    const limit = await checkRateLimit("quote", session.dbUser.id);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const raw: unknown = await request.json();
    const input = createShipmentSchema.parse(raw);
    assertCan(await accountStateFor(session), "shipment:create");

    const result = await createShipmentAndQuote({
      senderId: session.dbUser.id,
      input,
    });
    if (!result.ok) {
      return toApiResponse(result.error);
    }

    return NextResponse.json(
      {
        shipmentId: result.value.shipment.id,
        status: result.value.shipment.status,
        amountMinor: result.value.quote.amountMinor,
        amountLabel: formatTry(result.value.quote.amountMinor),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Gönderi bilgilerini kontrol edin." },
        { status: 422 },
      );
    }
    return toApiResponse(error);
  }
}
