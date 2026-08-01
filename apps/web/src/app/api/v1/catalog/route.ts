import { NextResponse } from "next/server";
import { formatTry } from "@yolla/core";
import { authenticateRequest, toApiResponse } from "@/lib/api-auth";
import { queryCatalog } from "@/features/shipments/queries";

export const dynamic = "force-dynamic";

/** Bölge ve boyut kataloğu — mobil gönderi oluşturma ekranı için. */
export async function GET(request: Request) {
  try {
    await authenticateRequest(request);
    const { zones, sizeClasses } = await queryCatalog();

    return NextResponse.json({
      zones: zones.map((z) => ({
        id: z.id,
        name: z.name,
        baseFeeMinor: z.baseFeeMinor,
        baseFeeLabel: formatTry(z.baseFeeMinor),
      })),
      sizeClasses: sizeClasses.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        multiplier: s.multiplier,
      })),
    });
  } catch (error) {
    return toApiResponse(error);
  }
}
