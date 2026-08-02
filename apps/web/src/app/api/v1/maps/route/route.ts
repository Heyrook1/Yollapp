import { NextResponse } from "next/server";
import { authenticateRequest, toApiResponse } from "@/lib/api-auth";
import { assertFeatureEnabled } from "@/lib/flags";
import { checkRateLimit } from "@/lib/rate-limit";
import { getMapsProvider } from "@/lib/providers/maps";
import { computeRouteSchema } from "@/features/maps/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await authenticateRequest(request);
    await assertFeatureEnabled("maps");
    const limit = await checkRateLimit("maps", session.dbUser.id);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Çok fazla rota isteği." }, { status: 429 });
    }

    const body: unknown = await request.json();
    const input = computeRouteSchema.parse(body);
    const route = await getMapsProvider().computeRoute(input);
    return NextResponse.json({ route });
  } catch (error) {
    return toApiResponse(error);
  }
}
