"use server";

import { DomainError, ForbiddenError, NotFoundError } from "@yolla/core";
import { prisma } from "@yolla/db";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { issueTrackingToken, revokeTrackingTokens } from "./service";

const shipmentIdSchema = z.object({ shipmentId: z.string().uuid() });

export type TrackingActionResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof DomainError) {
    switch (error.code) {
      case "FORBIDDEN":
        return "Bu gönderiye erişim yok.";
      case "NOT_FOUND":
        return "Gönderi bulunamadı.";
      default:
        return "İşlem tamamlanamadı.";
    }
  }
  console.error("tracking action failed", {
    error: error instanceof Error ? error.name : "unknown",
  });
  return "Bir hata oluştu. Lütfen tekrar deneyin.";
}

/** Takip linki üretir. Yalnızca gönderinin sahibi çağırabilir. */
export async function createTrackingLinkAction(
  rawInput: unknown,
): Promise<TrackingActionResult> {
  try {
    const session = await requireAuth();
    const { shipmentId } = shipmentIdSchema.parse(rawInput);

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, senderId: true },
    });
    if (!shipment) {
      throw new NotFoundError("Shipment not found");
    }
    // Sahiplik: "URL'i bilen erişir" durumu yasak.
    if (shipment.senderId !== session.dbUser.id) {
      throw new ForbiddenError("Not shipment owner");
    }

    const token = await issueTrackingToken(shipment.id);
    return { ok: true, url: `/t/${token}` };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function revokeTrackingLinkAction(
  rawInput: unknown,
): Promise<{ ok: boolean; message: string }> {
  try {
    const session = await requireAuth();
    const { shipmentId } = shipmentIdSchema.parse(rawInput);

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, senderId: true },
    });
    if (!shipment) {
      throw new NotFoundError("Shipment not found");
    }
    if (shipment.senderId !== session.dbUser.id) {
      throw new ForbiddenError("Not shipment owner");
    }

    const count = await revokeTrackingTokens(shipment.id);
    await writeAuditLog({
      actorUserId: session.dbUser.id,
      action: "tracking_token.revoked",
      resourceType: "shipment",
      resourceId: shipment.id,
    });
    return { ok: true, message: `${count} takip linki iptal edildi.` };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}
