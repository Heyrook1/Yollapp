import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@yolla/db";
import {
  NotFoundError,
  checkTrackingToken,
  maskAddress,
  maskRecipientName,
  trackingTokenExpiry,
  type ShipmentStatus,
} from "@yolla/core";

/**
 * Paylaşılabilir takip linki (CLAUDE.md §6.4).
 *
 * - Token 256-bit rastgele (≥128-bit şartını aşar), sıralı/tahmin edilebilir değil.
 * - DB'de yalnızca SHA-256 hash tutulur; ham token bir kez döner.
 * - İptal edilebilir ve süreli.
 * - Sayfa kişisel veri sızdırmaz: telefon hiç gösterilmez, ad ve adres maskelenir.
 */

const TOKEN_BYTES = 32;

export function generateTrackingToken(): { token: string; tokenHash: string } {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Sabit zamanlı karşılaştırma — hash uzunlukları eşit olduğu için güvenli. */
function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Gönderi için takip linki oluşturur. Sahiplik çağıran katmanda doğrulanır. */
export async function issueTrackingToken(shipmentId: string): Promise<string> {
  const { token, tokenHash } = generateTrackingToken();
  await prisma.trackingToken.create({
    data: {
      shipmentId,
      tokenHash,
      expiresAt: trackingTokenExpiry(),
    },
  });
  return token;
}

export async function revokeTrackingTokens(shipmentId: string): Promise<number> {
  const result = await prisma.trackingToken.updateMany({
    where: { shipmentId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export type PublicTrackingView = {
  code: string;
  status: ShipmentStatus;
  /** Maskeli alıcı adı — tam ad asla dönmez. */
  recipientName: string;
  /** Yalnızca bölge — sokak/numara dönmez. */
  dropoffArea: string;
  pickupArea: string;
  windowLabel: string | null;
  /** Sağlayıcı yok: canlı konum YOK. Statik veriyi "canlı" diye sunmuyoruz. */
  liveLocationAvailable: false;
  lastUpdatedLabel: string;
  events: { toStatus: ShipmentStatus; timeLabel: string }[];
};

export type TrackingLookupFailure = "not_found" | "expired" | "revoked";

export type TrackingLookupResult =
  | { ok: true; view: PublicTrackingView }
  | { ok: false; reason: TrackingLookupFailure };

const fmt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Nicosia",
  dateStyle: "short",
  timeStyle: "short",
});

/**
 * Token ile gönderiyi çözer. Auth GEREKTİRMEZ — bu yüzden dönen veri sınırlıdır
 * ve çağrı noktasında hız sınırı uygulanır.
 */
export async function lookupByTrackingToken(
  rawToken: string,
): Promise<TrackingLookupResult> {
  // Hash üzerinden arama: ham token DB'de yok, sızdırılamaz.
  const tokenHash = hashToken(rawToken);

  const record = await prisma.trackingToken.findUnique({
    where: { tokenHash },
    include: {
      shipment: {
        include: {
          deliveryWindow: true,
          events: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!record || !hashesMatch(record.tokenHash, tokenHash)) {
    return { ok: false, reason: "not_found" };
  }

  const check = checkTrackingToken(
    { expiresAt: record.expiresAt, revokedAt: record.revokedAt },
    new Date(),
  );
  if (!check.usable) {
    return { ok: false, reason: check.reason };
  }

  // Kullanım izi — kötüye kullanım tespiti için (kişisel veri değil).
  await prisma.trackingToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {
      /* izleme yazımı akışı bozmamalı */
    });

  const shipment = record.shipment;
  return {
    ok: true,
    view: {
      code: shipment.id.slice(0, 8).toUpperCase(),
      status: shipment.status,
      recipientName: maskRecipientName(shipment.recipientName),
      dropoffArea: maskAddress(shipment.dropoffAddress),
      pickupArea: maskAddress(shipment.pickupAddress),
      windowLabel: shipment.deliveryWindow
        ? `${fmt.format(shipment.deliveryWindow.startsAt)} – ${fmt.format(shipment.deliveryWindow.endsAt)}`
        : null,
      liveLocationAvailable: false,
      lastUpdatedLabel: fmt.format(shipment.updatedAt),
      events: shipment.events.map((e) => ({
        toStatus: e.toStatus,
        timeLabel: fmt.format(e.createdAt),
      })),
    },
  };
}
