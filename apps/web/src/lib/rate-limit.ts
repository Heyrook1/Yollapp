import { prisma } from "@yolla/db";

/**
 * Sunucu tarafında zorlanan hız sınırı (CLAUDE.md §6.7).
 *
 * Serverless'ta bellek içi sayaç örnekler arasında paylaşılmadığı için sabit
 * pencereli sayaç Postgres'te tutulur. Atomik `UPDATE ... RETURNING` ile
 * yarış koşulu olmadan artırılır.
 *
 * SINIR: Sabit pencere (sliding window değil), pencere sınırında iki katına
 * kadar istek geçebilir. Pilot ölçeği için kabul edilebilir; yüksek hacimde
 * Redis tabanlı sliding window'a taşınmalı.
 */

export type RateLimitBucket = "auth" | "quote" | "tracking" | "incident" | "payout";

type BucketConfig = { limit: number; windowSeconds: number };

const buckets: Record<RateLimitBucket, BucketConfig> = {
  // Kaba kuvvet ve hesap sayımına karşı.
  auth: { limit: 10, windowSeconds: 60 },
  // Fiyat teklifi kötüye kullanımı.
  quote: { limit: 30, windowSeconds: 60 },
  // Takip linki tarama saldırısına karşı.
  tracking: { limit: 60, windowSeconds: 60 },
  incident: { limit: 10, windowSeconds: 300 },
  payout: { limit: 5, windowSeconds: 3600 },
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Sayaç artır ve limiti kontrol et.
 *
 * Sayaç yazılamazsa (DB hatası) istek ENGELLENMEZ — hız sınırı altyapısı
 * uygulamayı komple durdurmamalı. Bunun yerine hata loglanır ve izin verilir;
 * bu bilinçli bir kullanılabilirlik tercihidir.
 */
export async function checkRateLimit(
  bucket: RateLimitBucket,
  identifier: string,
): Promise<RateLimitResult> {
  const config = buckets[bucket];
  const key = `${bucket}:${identifier}`;
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / (config.windowSeconds * 1000)) * config.windowSeconds * 1000,
  );
  const expiresAt = new Date(windowStart.getTime() + config.windowSeconds * 1000);

  try {
    // Tek sorguda upsert + artır. Pencere değiştiyse sayaç sıfırlanır.
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO rate_limit_counters (id, key, count, window_start, expires_at)
      VALUES (gen_random_uuid(), ${key}, 1, ${windowStart}, ${expiresAt})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limit_counters.window_start < ${windowStart} THEN 1
          ELSE rate_limit_counters.count + 1
        END,
        window_start = ${windowStart},
        expires_at = ${expiresAt}
      RETURNING count
    `;

    const count = rows[0]?.count ?? 1;
    const allowed = count <= config.limit;
    return {
      allowed,
      remaining: Math.max(0, config.limit - count),
      retryAfterSeconds: allowed
        ? 0
        : Math.ceil((expiresAt.getTime() - now.getTime()) / 1000),
    };
  } catch (error) {
    console.error("rate limit check failed", {
      bucket,
      error: error instanceof Error ? error.name : "unknown",
    });
    return { allowed: true, remaining: config.limit, retryAfterSeconds: 0 };
  }
}

/** Süresi dolmuş sayaçları temizler (arka plan işi). */
export async function pruneRateLimitCounters(): Promise<number> {
  const result = await prisma.rateLimitCounter.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
