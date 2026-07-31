"use server";

import { DomainError } from "@yolla/core";
import { formatTry } from "@yolla/core";
import { AppRole } from "@yolla/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { assertRole } from "@/lib/authorization";
import { acceptJobSchema, createShipmentSchema, markPaidSchema } from "./schemas";
import {
  acceptShipmentJob,
  createShipmentAndQuote,
  markShipmentPaid,
} from "./service";
import { messages } from "./messages";

export type ActionResult =
  | { ok: true; message: string; shipmentId?: string; amountLabel?: string }
  | { ok: false; message: string };

function toUserMessage(error: unknown): string {
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
  console.error("shipment action error", error instanceof Error ? error.message : "unknown");
  return messages.genericError;
}

export async function createShipmentAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    const input = createShipmentSchema.parse(rawInput);

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
    assertRole(session, AppRole.COURIER);
    const input = acceptJobSchema.parse(rawInput);
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
