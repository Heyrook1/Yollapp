import { prisma } from "@yolla/db";
import { ConflictError } from "@yolla/core";

/**
 * Operasyonel kill switch'ler — SUNUCUDA zorlanır (CLAUDE.md §11 / pilot kontrolü).
 *
 * Client tarafında bir butonu gizlemek koruma değildir; bu kontroller
 * server action / route handler içinde iş mantığından ÖNCE çağrılır.
 */

export type FeatureFlagId =
  | "shipment_creation"
  | "courier_matching"
  | "payments"
  | "payouts"
  | "notifications"
  | "business_bulk_import"
  | "phone_auth"
  | "maps"
  | "live_tracking"
  | "courier_presence"
  | "delivery_proof"
  | "ratings";

const flagMessages: Record<FeatureFlagId, string> = {
  shipment_creation: "Gönderi oluşturma şu anda geçici olarak kapalı.",
  courier_matching: "Kurye eşleştirme şu anda geçici olarak kapalı.",
  payments: "Ödeme alma şu anda geçici olarak kapalı.",
  payouts: "Para çekme şu anda kullanılamıyor.",
  notifications: "Bildirim gönderimi şu anda kapalı.",
  business_bulk_import: "Toplu gönderi içe aktarma henüz kullanıma açılmadı.",
  phone_auth: "Telefon ile giriş henüz kullanıma açılmadı.",
  maps: "Harita ve adres arama şu anda kapalı.",
  live_tracking: "Canlı konum takibi şu anda kapalı.",
  courier_presence: "Canlı kurye haritası şu anda kapalı.",
  delivery_proof: "Teslim doğrulama şu anda kapalı.",
  ratings: "Değerlendirme şu anda kapalı.",
};

/**
 * Bayrak durumu. Kayıt yoksa KAPALI kabul edilir (fail-closed) —
 * yeni bir özellik yanlışlıkla açık gelmez.
 */
export async function isFeatureEnabled(id: FeatureFlagId): Promise<boolean> {
  try {
    const flag = await prisma.featureFlag.findUnique({ where: { id } });
    return flag?.enabled ?? false;
  } catch (error) {
    // Bayrak okunamıyorsa güvenli taraf: kapalı.
    console.error("feature flag read failed", {
      flag: id,
      error: error instanceof Error ? error.name : "unknown",
    });
    return false;
  }
}

export async function assertFeatureEnabled(id: FeatureFlagId): Promise<void> {
  const enabled = await isFeatureEnabled(id);
  if (!enabled) {
    throw new ConflictError(flagMessages[id]);
  }
}

export async function listFeatureFlags() {
  return prisma.featureFlag.findMany({ orderBy: { id: "asc" } });
}
