/**
 * Kısa sipariş no ve teslim kodu — saf yardımcılar (hash Node tarafında).
 */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** YLA-XXXX biçiminde kısa sipariş no üret (entropy ~20 bit / 4 char). */
export function formatPublicCode(randomPart: string): string {
  const part = randomPart
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
  if (part.length < 4) {
    throw new Error("public_code_part_too_short");
  }
  return `YLA-${part}`;
}

export function isValidPublicCodeFormat(code: string): boolean {
  return /^YLA-[A-Z0-9]{4}$/.test(code);
}

/** 6 haneli sayısal teslim kodu üretimi için digit string. */
export function normalizeDeliveryCodeDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export function isValidDeliveryCodeDigits(digits: string): boolean {
  return /^\d{6}$/.test(digits);
}

/** Client-safe alphabet helper for tests / generators. */
export function randomPublicCodePart(rng: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)]!;
  }
  return out;
}

export function randomDeliveryCodeDigits(rng: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += String(Math.floor(rng() * 10));
  }
  return out;
}
