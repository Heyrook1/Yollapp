import { z } from "zod";

/**
 * Ortam değişkeni doğrulaması (CLAUDE.md §6.5).
 *
 * Production'da kritik bir sağlayıcı eksikse uygulama AÇIKÇA hata vermeli —
 * sessizce mock sağlayıcıya düşmek yasak. Bu yüzden production'da fail-closed.
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url("DATABASE_URL geçerli bir bağlantı adresi olmalı"),
  DIRECT_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL geçersiz"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY eksik"),

  // Henüz yapılandırılmamış sağlayıcılar — opsiyonel, ama production'da
  // ilgili özellik bayrağı açıksa zorunlu hale gelir (aşağıdaki çapraz kontrol).
  PAYMENTS_PROVIDER: z.enum(["none", "manual"]).default("none"),
  PAYMENTS_WEBHOOK_SECRET: z.string().min(16).optional(),
  SMS_PROVIDER: z.enum(["none", "log"]).default("none"),
  SMS_API_KEY: z.string().min(8).optional(),
  MAPS_PROVIDER: z.enum(["none", "placeholder", "google"]).default("none"),
  MAPS_API_KEY: z.string().min(8).optional(),
  GOOGLE_MAPS_SERVER_KEY: z.string().min(8).optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY: z.string().min(8).optional(),
  GOOGLE_MAPS_MAP_ID: z.string().optional(),
  GOOGLE_MAPS_ROUTES_ENABLED: z.enum(["true", "false"]).default("true"),
  GOOGLE_MAPS_PLACES_ENABLED: z.enum(["true", "false"]).default("true"),
  GOOGLE_MAPS_DEFAULT_LAT: z.coerce.number().optional(),
  GOOGLE_MAPS_DEFAULT_LNG: z.coerce.number().optional(),
  SENTRY_DSN: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export type EnvValidationResult =
  | { ok: true; env: ServerEnv; warnings: string[] }
  | { ok: false; errors: string[] };

export function validateEnv(raw: NodeJS.ProcessEnv = process.env): EnvValidationResult {
  const parsed = serverSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }

  const env = parsed.data;
  const warnings: string[] = [];
  const errors: string[] = [];

  const isProd = env.NODE_ENV === "production";

  // Production'da gerçek sağlayıcı olmadan para/bildirim akışı açılamaz.
  if (isProd && env.PAYMENTS_PROVIDER === "none") {
    warnings.push(
      "PAYMENTS_PROVIDER=none — ödeme sağlayıcısı yok. `payments` bayrağı kapalı tutulmalı.",
    );
  }
  if (isProd && env.PAYMENTS_PROVIDER !== "none" && !env.PAYMENTS_WEBHOOK_SECRET) {
    errors.push(
      "PAYMENTS_WEBHOOK_SECRET zorunlu: webhook imzası doğrulanmadan ödeme kabul edilemez.",
    );
  }
  if (isProd && env.SMS_PROVIDER === "none") {
    warnings.push("SMS_PROVIDER=none — bildirimler gönderilemez, `notifications` bayrağı kapalı olmalı.");
  }
  if (isProd && !env.SENTRY_DSN) {
    warnings.push("SENTRY_DSN yok — production hata izleme devre dışı.");
  }
  if (env.MAPS_PROVIDER === "google" && !env.GOOGLE_MAPS_SERVER_KEY) {
    warnings.push(
      "MAPS_PROVIDER=google ama GOOGLE_MAPS_SERVER_KEY yok — rota/adres sunucu çağrıları kapalı.",
    );
  }
  if (env.MAPS_PROVIDER === "google" && !env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY) {
    warnings.push(
      "NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY yok — harita UI placeholder'a düşer.",
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, env, warnings };
}

/**
 * Doğrulanmış ortam. Production'da geçersizse fırlatır (fail-closed);
 * development'ta uyarı verip devam eder ki yerel kurulum kolay kalsın.
 */
export function getEnv(): ServerEnv {
  if (cached) return cached;

  const result = validateEnv();
  if (!result.ok) {
    const message = `Ortam yapılandırması geçersiz:\n- ${result.errors.join("\n- ")}`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }
    console.warn(message);
    cached = serverSchema.parse({
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://localhost:5432/dev",
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "local-anon-key-placeholder",
    });
    return cached;
  }

  for (const warning of result.warnings) {
    console.warn(`[env] ${warning}`);
  }
  cached = result.env;
  return cached;
}
