import { NextResponse } from "next/server";
import { authenticateRequest, toApiResponse } from "@/lib/api-auth";
import { assertFeatureEnabled } from "@/lib/flags";
import { checkRateLimit } from "@/lib/rate-limit";
import { getMapsProvider } from "@/lib/providers/maps";
import { autocompleteSchema } from "@/features/maps/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await authenticateRequest(request);
    await assertFeatureEnabled("maps");
    const limit = await checkRateLimit("maps", session.dbUser.id);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla adres araması. Lütfen bekleyin." },
        { status: 429 },
      );
    }

    const body: unknown = await request.json();
    const input = autocompleteSchema.parse(body);
    const provider = getMapsProvider();
    const suggestions = await provider.autocomplete(input);
    return NextResponse.json({ suggestions });
  } catch (error) {
    return toApiResponse(error);
  }
}
