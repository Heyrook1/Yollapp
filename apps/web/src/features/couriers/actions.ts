"use server";

import { DomainError } from "@yolla/core";
import { requireAuth } from "@/lib/auth";
import { assertRole } from "@/lib/authorization";
import { AppRole } from "@yolla/db";
import { applyCourierSchema, reviewCourierSchema } from "./schemas";
import { applyForCourier, reviewCourierApplication } from "./service";
import { messages } from "./messages";
import { revalidatePath } from "next/cache";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function toUserMessage(error: unknown): string {
  if (error instanceof DomainError) {
    switch (error.code) {
      case "UNAUTHORIZED":
        return messages.unauthorized;
      case "FORBIDDEN":
        return messages.forbidden;
      case "CONFLICT":
        if (error.message.includes("already approved")) {
          return messages.alreadyApproved;
        }
        return messages.genericError;
      default:
        return messages.genericError;
    }
  }
  console.error("courier action error", error instanceof Error ? error.message : "unknown");
  return messages.genericError;
}

export async function applyCourierAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    const input = applyCourierSchema.parse(rawInput);
    const result = await applyForCourier({ userId: session.dbUser.id, input });
    if (!result.ok) {
      return { ok: false, message: toUserMessage(result.error) };
    }
    if (result.value.status === "PENDING") {
      revalidatePath("/courier/apply");
      return { ok: true, message: messages.applySuccess };
    }
    return { ok: true, message: messages.applySuccess };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

export async function reviewCourierAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    assertRole(session, AppRole.ADMIN);
    const input = reviewCourierSchema.parse(rawInput);
    const result = await reviewCourierApplication({
      adminUserId: session.dbUser.id,
      adminRoles: session.dbUser.roles,
      input,
    });
    if (!result.ok) {
      return { ok: false, message: toUserMessage(result.error) };
    }
    revalidatePath("/admin/couriers");
    return {
      ok: true,
      message: input.decision === "APPROVE" ? "Başvuru onaylandı." : "Başvuru reddedildi.",
    };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}
