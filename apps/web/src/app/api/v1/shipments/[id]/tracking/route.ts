import { NextResponse } from "next/server";
import { z } from "zod";
import { ForbiddenError, NotFoundError } from "@yolla/core";
import { prisma } from "@yolla/db";
import { authenticateRequest, toApiResponse } from "@/lib/api-auth";
import { issueTrackingToken, revokeTrackingTokens } from "@/features/tracking/service";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

async function assertOwner(shipmentId: string, userId: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: { id: true, senderId: true },
  });
  if (!shipment) throw new NotFoundError("Gönderi bulunamadı.");
  // Takip linki üretmek sahibine özeldir.
  if (shipment.senderId !== userId) throw new ForbiddenError("Bu gönderiye erişim yok.");
  return shipment;
}

/** Takip linki üret. Ham token yalnızca burada bir kez döner. */
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

    await assertOwner(id, session.dbUser.id);
    const token = await issueTrackingToken(id);
    return NextResponse.json({ token, path: `/t/${token}` }, { status: 201 });
  } catch (error) {
    return toApiResponse(error);
  }
}

/** Aktif takip linklerini iptal et. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await authenticateRequest(request);
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Gönderi bulunamadı." }, { status: 404 });
    }

    await assertOwner(id, session.dbUser.id);
    const revoked = await revokeTrackingTokens(id);
    await writeAuditLog({
      actorUserId: session.dbUser.id,
      action: "tracking_token.revoked",
      resourceType: "shipment",
      resourceId: id,
    });
    return NextResponse.json({ revoked });
  } catch (error) {
    return toApiResponse(error);
  }
}
