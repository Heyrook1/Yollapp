import { NextResponse } from "next/server";
import { z } from "zod";
import { accountStateFor, authenticateRequest, toApiResponse } from "@/lib/api-auth";
import { assertCan } from "@/lib/authz";
import { assertFeatureEnabled } from "@/lib/flags";
import {
  acceptShipmentJob,
  progressShipmentAsCourier,
} from "@/features/shipments/service";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();
const bodySchema = z.object({
  action: z.enum(["accept", "pick_up", "start_transit", "deliver", "fail"]),
});

const eventByAction = {
  pick_up: "PICK_UP",
  start_transit: "START_TRANSIT",
  deliver: "DELIVER",
  fail: "FAIL_DELIVERY",
} as const;

/** İş kabul ve görev ilerletme. Geçişler sunucudaki state machine ile doğrulanır. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await authenticateRequest(request);
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "İş bulunamadı." }, { status: 404 });
    }

    const raw: unknown = await request.json();
    const { action } = bodySchema.parse(raw);
    const state = await accountStateFor(session);

    if (action === "accept") {
      await assertFeatureEnabled("courier_matching");
      assertCan(state, "courier:accept_job");
      const result = await acceptShipmentJob({
        courierId: session.dbUser.id,
        shipmentId: id,
      });
      if (!result.ok) return toApiResponse(result.error);
      return NextResponse.json({ status: result.value.status });
    }

    assertCan(state, "courier:progress_job");
    const result = await progressShipmentAsCourier({
      courierId: session.dbUser.id,
      shipmentId: id,
      event: eventByAction[action],
    });
    if (!result.ok) return toApiResponse(result.error);
    return NextResponse.json({ status: result.value.status });
  } catch (error) {
    return toApiResponse(error);
  }
}
