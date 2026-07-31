/**
 * Takip linki kuralları — saf mantık (crypto burada DEĞİL, server tarafında).
 *
 * Token üretimi/hash'i node:crypto gerektirdiği için `apps/web/src/features/tracking`
 * altında yaşar; bu modül client bundle'a girebilecek saf kuralları içerir.
 */

export type TrackingTokenState = {
  expiresAt: Date;
  revokedAt: Date | null;
};

export type TrackingTokenRejection = "expired" | "revoked";

export type TrackingTokenCheck =
  | { usable: true }
  | { usable: false; reason: TrackingTokenRejection };

export function checkTrackingToken(
  token: TrackingTokenState,
  now: Date = new Date(),
): TrackingTokenCheck {
  if (token.revokedAt !== null) {
    return { usable: false, reason: "revoked" };
  }
  if (token.expiresAt.getTime() <= now.getTime()) {
    return { usable: false, reason: "expired" };
  }
  return { usable: true };
}

/** Varsayılan geçerlilik: teslimattan sonra da makul süre izlenebilsin diye 14 gün. */
export const TRACKING_TOKEN_TTL_DAYS = 14;

export function trackingTokenExpiry(
  from: Date = new Date(),
  days: number = TRACKING_TOKEN_TTL_DAYS,
): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Takip sayfası kişisel veri sızdırmaz (CLAUDE.md §6.4):
 * alıcı adı baş harflere iner, adres yalnızca son bileşene (bölge) düşer,
 * telefon hiç gösterilmez.
 */
export function maskRecipientName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts
    .map((part, i) =>
      i === 0 ? part : `${part.charAt(0).toLocaleUpperCase("tr-TR")}.`,
    )
    .join(" ");
}

export function maskAddress(address: string): string {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return "Adres gizli";
  return parts[parts.length - 1]!;
}
