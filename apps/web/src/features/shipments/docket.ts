import { createHash, randomBytes } from "node:crypto";
import {
  formatPublicCode,
  isValidDeliveryCodeDigits,
  normalizeDeliveryCodeDigits,
  randomDeliveryCodeDigits,
  randomPublicCodePart,
} from "@yolla/core";
import { prisma } from "@yolla/db";
import { generateTrackingToken, issueTrackingToken } from "@/features/tracking/service";

export function hashDeliveryCode(digits: string): string {
  return createHash("sha256").update(digits).digest("hex");
}

export function verifyDeliveryCode(digits: string, hash: string | null | undefined): boolean {
  if (!hash) return true; // eski gönderiler — kapı kapalı değil
  const normalized = normalizeDeliveryCodeDigits(digits);
  if (!isValidDeliveryCodeDigits(normalized)) return false;
  const a = Buffer.from(hashDeliveryCode(normalized), "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i]! ^ b[i]!;
  return out === 0;
}

/** PAID sonrası: publicCode + teslim kodu + takip token (idempotent). */
export async function ensureShipmentDocket(shipmentId: string): Promise<{
  publicCode: string;
  deliveryCodePlain: string | null;
  trackingToken: string | null;
}> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { trackingTokens: { where: { revokedAt: null }, take: 1 } },
  });
  if (!shipment) {
    throw new Error("shipment_missing");
  }

  let publicCode = shipment.publicCode;
  if (!publicCode) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = formatPublicCode(randomPublicCodePart());
      try {
        await prisma.shipment.update({
          where: { id: shipmentId },
          data: { publicCode: candidate },
        });
        publicCode = candidate;
        break;
      } catch {
        /* unique çakışması — tekrar dene */
      }
    }
    if (!publicCode) {
      publicCode = formatPublicCode(
        randomBytes(3).toString("hex").slice(0, 4).toUpperCase(),
      );
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: { publicCode },
      });
    }
  }

  let deliveryCodePlain: string | null = null;
  if (!shipment.deliveryCodeHash) {
    deliveryCodePlain = randomDeliveryCodeDigits();
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { deliveryCodeHash: hashDeliveryCode(deliveryCodePlain) },
    });
  }

  let trackingToken: string | null = null;
  if (shipment.trackingTokens.length === 0) {
    trackingToken = await issueTrackingToken(shipmentId);
  }

  return { publicCode, deliveryCodePlain, trackingToken };
}

/** Test / bellek yolu için ham token üretmeden hash. */
export function peekTrackingTokenPair() {
  return generateTrackingToken();
}
