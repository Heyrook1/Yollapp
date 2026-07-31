import { NextResponse } from "next/server";
import { prisma } from "@yolla/db";
import { validateEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Sağlık / hazırlık uç noktası (Phase 17).
 *
 * Sır ya da kişisel veri DÖNMEZ. Yalnızca bileşen durumları ve derleme kimliği.
 * İzleme sistemleri buradaki `status` alanını alarm için kullanabilir.
 */
export async function GET() {
  const startedAt = Date.now();

  const checks: Record<string, "ok" | "degraded" | "down"> = {};

  // Veritabanı erişilebilirliği.
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "down";
  }

  // Ortam yapılandırması geçerli mi (sır DEĞERİ dönmez, yalnızca geçerlilik).
  const env = validateEnv();
  checks.configuration = env.ok ? "ok" : "down";

  const healthy = Object.values(checks).every((c) => c === "ok");

  return NextResponse.json(
    {
      status: healthy ? "ok" : "unhealthy",
      checks,
      version: process.env.COMMIT_SHA ?? "unknown",
      environment: process.env.NODE_ENV ?? "unknown",
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
