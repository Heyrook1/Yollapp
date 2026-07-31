"use server";

import { DomainError } from "@yolla/core";
import { formatTry } from "@yolla/core";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createShipmentSchema } from "./schemas";
import { createShipmentAndQuote } from "./service";
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

    // Price from client is ignored by design — only zone/size/express drive quote.
    if (
      rawInput &&
      typeof rawInput === "object" &&
      "price" in rawInput
    ) {
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
