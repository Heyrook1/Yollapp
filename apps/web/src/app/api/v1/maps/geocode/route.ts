import { NextResponse } from "next/server";
import { authenticateRequest, toApiResponse } from "@/lib/api-auth";
import { assertFeatureEnabled } from "@/lib/flags";
import { checkRateLimit } from "@/lib/rate-limit";
import { getMapsProvider } from "@/lib/providers/maps";
import { reverseGeocodeSchema } from "@/features/maps/schemas";

export const dynamic = "force-dynamic";

/** Koordinat → açık adres (otomatik konum / harita pini). */
export async function POST(request: Request) {
  try {
    const session = await authenticateRequest(request);
    await assertFeatureEnabled("maps");
    const limit = await checkRateLimit("maps", session.dbUser.id);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Çok fazla istek." }, { status: 429 });
    }

    const body: unknown = await request.json();
    const input = reverseGeocodeSchema.parse(body);
    const place = await getMapsProvider().reverseGeocode(input);
    return NextResponse.json({ place });
  } catch (error) {
    return toApiResponse(error);
  }
}
