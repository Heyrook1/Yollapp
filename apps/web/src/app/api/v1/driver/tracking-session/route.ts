import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest, toApiResponse } from "@/lib/api-auth";
import { assertFeatureEnabled } from "@/lib/flags";
import { ensureTrackingSession } from "@/features/maps/location-service";

export const dynamic = "force-dynamic";

const schema = z.object({ shipmentId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const session = await authenticateRequest(request);
    await assertFeatureEnabled("live_tracking");
    const body: unknown = await request.json();
    const { shipmentId } = schema.parse(body);
    const result = await ensureTrackingSession({
      shipmentId,
      driverId: session.dbUser.id,
    });
    if (!result.ok) return toApiResponse(result.error);
    return NextResponse.json(result.value, { status: 201 });
  } catch (error) {
    return toApiResponse(error);
  }
}
