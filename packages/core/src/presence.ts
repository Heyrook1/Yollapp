/**
 * Kurye varlık (presence) saf kuralları — React/Next yok.
 */

import { locationFreshness, LOCATION_POLICY } from "./geo";

export const COURIER_ACTIVITIES = ["AVAILABLE", "ON_JOB", "BUSY"] as const;
export type CourierActivityCode = (typeof COURIER_ACTIVITIES)[number];

export function isCourierActivity(value: string): value is CourierActivityCode {
  return (COURIER_ACTIVITIES as readonly string[]).includes(value);
}

/**
 * Faaliyet türetme — tek doğruluk kaynağı.
 * Öncelik: BUSY (yolcu) > ON_JOB (aktif teslimat) > AVAILABLE.
 */
export function deriveCourierActivity(params: {
  sharingEnabled: boolean;
  carryingPassenger: boolean;
  hasActiveTrackableJob: boolean;
  forceBusy?: boolean;
}): CourierActivityCode | null {
  if (!params.sharingEnabled) return null;
  if (params.carryingPassenger || params.forceBusy) return "BUSY";
  if (params.hasActiveTrackableJob) return "ON_JOB";
  return "AVAILABLE";
}

/** Nearby listesinde gösterilebilir mi? (paylaşım açık + stale değil) */
export function isPresenceListable(params: {
  sharingEnabled: boolean;
  lastSeenAt: Date;
  now?: Date;
}): boolean {
  if (!params.sharingEnabled) return false;
  return locationFreshness(params.lastSeenAt, params.now) !== "offline";
}

export const PRESENCE_POLL_INTERVAL_MS = 12_000;

export { LOCATION_POLICY };
