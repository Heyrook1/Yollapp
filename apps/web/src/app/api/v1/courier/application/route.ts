import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { accountStateFor, authenticateRequest, toApiResponse } from "@/lib/api-auth";
import { assertCan } from "@/lib/authz";
import { applyCourierSchema } from "@/features/couriers/schemas";
import { applyForCourier } from "@/features/couriers/service";

export const dynamic = "force-dynamic";

/** Kurye başvurusu. Onay admin tarafından verilir — burada otomatik onay YOK. */
export async function POST(request: Request) {
  try {
    const session = await authenticateRequest(request);
    const state = await accountStateFor(session);
    assertCan(state, "courier:apply");

    const raw: unknown = await request.json();
    const input = applyCourierSchema.parse(raw);

    const result = await applyForCourier({
      userId: session.dbUser.id,
      input,
    });
    if (!result.ok) {
      return toApiResponse(result.error);
    }

    return NextResponse.json(
      { status: result.value.status },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Başvuru bilgilerini kontrol edin." },
        { status: 422 },
      );
    }
    return toApiResponse(error);
  }
}
