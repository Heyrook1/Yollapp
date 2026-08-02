/**
 * Uygulama modu — aynı anda tek shell (gönderici | kurye).
 * Tercih cookie'de tutulur; login `next` yoksa buradan yönlendirilir.
 */

export type AppMode = "sender" | "courier";

export const MODE_COOKIE = "yolla_mode";
const MAX_AGE_DAYS = 180;

export function parseAppMode(raw: string | null | undefined): AppMode | null {
  if (raw === "sender" || raw === "courier") return raw;
  return null;
}

export function homePathForMode(mode: AppMode): string {
  return mode === "courier" ? "/courier/jobs" : "/sender";
}

/** Client: tercih edilen modu oku. */
export function getPreferredModeClient(): AppMode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${MODE_COOKIE}=`));
  if (!match) return null;
  return parseAppMode(decodeURIComponent(match.split("=")[1] ?? ""));
}

/** Client: modu yaz ve isteğe bağlı hedefe git. */
export function setPreferredModeClient(mode: AppMode): void {
  if (typeof document === "undefined") return;
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${MODE_COOKIE}=${mode}; path=/; max-age=${maxAge}; samesite=lax`;
}

/**
 * Login yönlendirme önceliği:
 * 1) geçerli ?next=
 * 2) tercih cookie
 * 3) /sender
 */
export function resolvePostAuthPath(
  nextParam: string | null,
  preferredMode: AppMode | null,
): string {
  if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
    return nextParam;
  }
  if (preferredMode) return homePathForMode(preferredMode);
  return "/sender";
}
