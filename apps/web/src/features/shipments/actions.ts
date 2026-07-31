"use server";

import { DomainError } from "@yolla/core";
import { formatTry } from "@yolla/core";
import { ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { requireAuth, type SessionUser } from "@/lib/auth";
import { assertCan, type AccountState } from "@/lib/authz";
import { assertFeatureEnabled } from "@/lib/flags";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@yolla/db";

/** Yetki kararı için kurye durumunu da içeren hesap görünümü. */
async function accountState(session: SessionUser): Promise<AccountState> {
  const profile = await prisma.courierProfile.findUnique({
    where: { userId: session.dbUser.id },
    select: { status: true },
  });
  return { user: session.dbUser, courierStatus: profile?.status ?? null };
}
import {
  acceptJobSchema,
  cancelShipmentSchema,
  courierProgressSchema,
  createShipmentSchema,
  markPaidSchema,
} from "./schemas";
import {
  acceptShipmentJob,
  cancelShipmentAsSender,
  createShipmentAndQuote,
  markShipmentPaid,
  progressShipmentAsCourier,
} from "./service";
import { messages } from "./messages";

export type ActionResult =
  | { ok: true; message: string; shipmentId?: string; amountLabel?: string }
  | { ok: false; message: string };

function zodToUserMessage(error: ZodError): string {
  const path = error.issues[0]?.path[0];
  switch (path) {
    case "recipientPhone":
      return messages.validation.recipientPhone;
    case "recipientName":
      return messages.validation.recipientName;
    case "pickupAddress":
      return messages.validation.pickupAddress;
    case "dropoffAddress":
      return messages.validation.dropoffAddress;
    case "windowEndsAt":
    case "windowStartsAt":
      return messages.validation.window;
    case "zoneId":
      return messages.validation.zone;
    case "sizeClassId":
      return messages.validation.size;
    default:
      return messages.validation.generic;
  }
}

function toUserMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return zodToUserMessage(error);
  }
  if (error instanceof DomainError) {
    switch (error.code) {
      case "UNAUTHORIZED":
        return messages.unauthorized;
      case "FORBIDDEN":
        return messages.forbidden;
      case "NOT_FOUND":
        return messages.notFound;
      case "CONFLICT":
        return messages.conflict;
      default:
        return messages.genericError;
    }
  }
  console.error(
    "shipment action error",
    error instanceof Error ? error.message : "unknown",
  );
  return messages.genericError;
}

export async function createShipmentAction(rawInput: unknown): Promise<ActionResult> {
  try {
    // 1. kimlik → 2. kill switch → 3. hız sınırı → 4. Zod → 5. yetki → 6. iş mantığı
    const session = await requireAuth();
    await assertFeatureEnabled("shipment_creation");

    const limit = await checkRateLimit("quote", session.dbUser.id);
    if (!limit.allowed) {
      return { ok: false, message: messages.rateLimited };
    }

    const input = createShipmentSchema.parse(rawInput);
    assertCan(await accountState(session), "shipment:create");

    if (rawInput && typeof rawInput === "object" && "price" in rawInput) {
      console.error("ignored client-supplied price on createShipment", {
        shipmentHint: "create",
      });
    }

    const result = await createShipmentAndQuote({
      senderId: session.dbUser.id,
      input,
    });
    if (!result.ok) {
      return { ok: false, message: toUserMessage(result.error) };
    }

    revalidatePath("/sender");
    revalidatePath("/sender/shipments");
    revalidatePath("/courier/jobs");
    return {
      ok: true,
      message: messages.createSuccess,
      shipmentId: result.value.shipment.id,
      amountLabel: formatTry(result.value.quote.amountMinor),
    };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

export async function markPaidAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    const input = markPaidSchema.parse(rawInput);
    const result = await markShipmentPaid({
      senderId: session.dbUser.id,
      shipmentId: input.shipmentId,
    });
    if (!result.ok) {
      return { ok: false, message: toUserMessage(result.error) };
    }
    revalidatePath("/sender/shipments");
    revalidatePath("/courier/jobs");
    return { ok: true, message: messages.paySuccess, shipmentId: result.value.id };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

export async function acceptJobAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await assertFeatureEnabled("courier_matching");
    const input = acceptJobSchema.parse(rawInput);
    // Onaylı olmayan / askıya alınmış kurye iş kabul edemez.
    assertCan(await accountState(session), "courier:accept_job");
    const result = await acceptShipmentJob({
      courierId: session.dbUser.id,
      shipmentId: input.shipmentId,
    });
    if (!result.ok) {
      return { ok: false, message: toUserMessage(result.error) };
    }
    revalidatePath("/courier/jobs");
    revalidatePath("/courier/jobs/mine");
    revalidatePath("/sender/shipments");
    return { ok: true, message: messages.acceptSuccess, shipmentId: result.value.id };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

export async function courierProgressAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    const input = courierProgressSchema.parse(rawInput);
    assertCan(await accountState(session), "courier:progress_job");
    const result = await progressShipmentAsCourier({
      courierId: session.dbUser.id,
      shipmentId: input.shipmentId,
      event: input.event,
    });
    if (!result.ok) {
      return { ok: false, message: toUserMessage(result.error) };
    }
    revalidatePath("/courier/jobs/mine");
    revalidatePath("/sender/shipments");
    revalidatePath(`/sender/shipments/${input.shipmentId}`);
    return {
      ok: true,
      message: messages.progress[input.event],
      shipmentId: result.value.id,
    };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

export async function cancelShipmentAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    const input = cancelShipmentSchema.parse(rawInput);
    assertCan(await accountState(session), "shipment:cancel");
    const result = await cancelShipmentAsSender({
      senderId: session.dbUser.id,
      shipmentId: input.shipmentId,
    });
    if (!result.ok) {
      return { ok: false, message: toUserMessage(result.error) };
    }
    revalidatePath("/sender/shipments");
    revalidatePath(`/sender/shipments/${input.shipmentId}`);
    revalidatePath("/courier/jobs");
    return { ok: true, message: messages.cancelSuccess, shipmentId: result.value.id };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}
