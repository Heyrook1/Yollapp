import { NextResponse } from "next/server";
import { authenticateRequest, toApiResponse } from "@/lib/api-auth";
import { assertCan, type AccountState } from "@/lib/authz";
import { assertFeatureEnabled } from "@/lib/flags";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@yolla/db";
import { locationUpdateSchema } from "@/features/maps/schemas";
import { ingestDriverLocation } from "@/features/maps/location-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await authenticateRequest(request);
    await assertFeatureEnabled("live_tracking");
    const limit = await checkRateLimit("location", session.dbUser.id);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Konum güncelleme limiti aşıldı." },
        { status: 429 },
      );
    }

    const profile = await prisma.courierProfile.findUnique({
      where: { userId: session.dbUser.id },
      select: { status: true },
    });
    const state: AccountState = {
      user: session.dbUser,
      courierStatus: profile?.status ?? null,
    };
    assertCan(state, "courier:progress_job");

    const body: unknown = await request.json();
    const input = locationUpdateSchema.parse(body);
    const result = await ingestDriverLocation({
      ...input,
      driverId: session.dbUser.id,
    });
    if (!result.ok) return toApiResponse(result.error);
    return NextResponse.json(result.value);
  } catch (error) {
    return toApiResponse(error);
  }
}
