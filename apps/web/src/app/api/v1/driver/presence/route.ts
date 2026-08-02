import { NextResponse } from "next/server";
import {
  accountStateFor,
  authenticateRequest,
  toApiResponse,
} from "@/lib/api-auth";
import { assertCan } from "@/lib/authz";
import { assertFeatureEnabled } from "@/lib/flags";
import { checkRateLimit } from "@/lib/rate-limit";
import { presenceUpdateSchema } from "@/features/maps/schemas";
import {
  getMyPresence,
  upsertCourierPresence,
} from "@/features/maps/presence-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await authenticateRequest(request);
    await assertFeatureEnabled("courier_presence");
    const state = await accountStateFor(session);
    assertCan(state, "courier:share_presence");
    const presence = await getMyPresence(session.dbUser.id);
    return NextResponse.json({ presence });
  } catch (error) {
    return toApiResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await authenticateRequest(request);
    await assertFeatureEnabled("courier_presence");
    const limit = await checkRateLimit("location", session.dbUser.id);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Konum güncelleme limiti aşıldı." },
        { status: 429 },
      );
    }

    const state = await accountStateFor(session);
    assertCan(state, "courier:share_presence");

    const body: unknown = await request.json();
    const input = presenceUpdateSchema.parse(body);
    const result = await upsertCourierPresence({
      courierUserId: session.dbUser.id,
      input,
    });
    if (!result.ok) return toApiResponse(result.error);
    return NextResponse.json(result.value);
  } catch (error) {
    return toApiResponse(error);
  }
}
