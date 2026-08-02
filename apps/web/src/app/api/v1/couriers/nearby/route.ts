import { NextResponse } from "next/server";
import {
  accountStateFor,
  authenticateRequest,
  toApiResponse,
} from "@/lib/api-auth";
import { assertCan } from "@/lib/authz";
import { assertFeatureEnabled } from "@/lib/flags";
import { checkRateLimit } from "@/lib/rate-limit";
import { nearbyCouriersQuerySchema } from "@/features/maps/schemas";
import { listNearbyCouriers } from "@/features/maps/presence-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await authenticateRequest(request);
    await assertFeatureEnabled("courier_presence");
    const limit = await checkRateLimit("maps", session.dbUser.id);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Harita sorgu limiti aşıldı." },
        { status: 429 },
      );
    }

    const state = await accountStateFor(session);
    assertCan(state, "courier:view_presence");

    const url = new URL(request.url);
    const query = nearbyCouriersQuerySchema.parse({
      south: url.searchParams.get("south"),
      west: url.searchParams.get("west"),
      north: url.searchParams.get("north"),
      east: url.searchParams.get("east"),
      activity: url.searchParams.get("activity") ?? undefined,
      vehicleType: url.searchParams.get("vehicleType") ?? undefined,
    });

    const couriers = await listNearbyCouriers(query);
    // PII yok — yalnızca id, koordinat, araç, faaliyet, tazelik.
    return NextResponse.json({ couriers });
  } catch (error) {
    return toApiResponse(error);
  }
}
