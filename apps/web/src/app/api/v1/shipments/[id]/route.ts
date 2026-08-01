import { NextResponse } from "next/server";
import { z } from "zod";
import {
  accountStateFor,
  authenticateRequest,
  isAdmin,
  toApiResponse,
} from "@/lib/api-auth";
import { assertCan } from "@/lib/authz";
import { queryShipmentDetail } from "@/features/shipments/queries";
import {
  cancelShipmentAsSender,
  markShipmentPaid,
} from "@/features/shipments/service";
import { assertFeatureEnabled } from "@/lib/flags";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();
const actionSchema = z.object({ action: z.enum(["pay", "cancel"]) });

/** Gönderi detayı. Sahiplik yoksa 404 — kaydın varlığı bile sızdırılmaz. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await authenticateRequest(request);
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Gönderi bulunamadı." }, { status: 404 });
    }

    const detail = await queryShipmentDetail(id, {
      id: session.dbUser.id,
      isAdmin: isAdmin(session),
    });
    if (!detail) {
      return NextResponse.json({ error: "Gönderi bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({
      id: detail.id,
      code: detail.id.slice(0, 8).toUpperCase(),
      status: detail.status,
      viewer: detail.viewer,
      isExpress: detail.isExpress,
      pickupAddress: detail.pickupAddress,
      dropoffAddress: detail.dropoffAddress,
      recipientName: detail.recipientName,
      zoneName: detail.zoneName,
      sizeName: detail.sizeName,
      amountLabel: detail.amountLabel,
      windowLabel: detail.window?.label ?? null,
      events: detail.events.map((e) => ({
        toStatus: e.toStatus,
        timeLabel: e.timeLabel,
      })),
    });
  } catch (error) {
    return toApiResponse(error);
  }
}

/** Ödeme (mock) veya iptal. Durum geçişi sunucudaki state machine ile yapılır. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await authenticateRequest(request);
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Gönderi bulunamadı." }, { status: 404 });
    }

    const raw: unknown = await request.json();
    const { action } = actionSchema.parse(raw);
    const state = await accountStateFor(session);

    if (action === "pay") {
      await assertFeatureEnabled("payments");
      assertCan(state, "shipment:create");
      const result = await markShipmentPaid({
        senderId: session.dbUser.id,
        shipmentId: id,
      });
      if (!result.ok) return toApiResponse(result.error);
      return NextResponse.json({ status: result.value.status });
    }

    assertCan(state, "shipment:cancel");
    const result = await cancelShipmentAsSender({
      senderId: session.dbUser.id,
      shipmentId: id,
    });
    if (!result.ok) return toApiResponse(result.error);
    return NextResponse.json({ status: result.value.status });
  } catch (error) {
    return toApiResponse(error);
  }
}
