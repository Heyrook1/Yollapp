"use server";

import { revalidatePath } from "next/cache";
import { DomainError } from "@yolla/core";
import { requireAuth } from "@/lib/auth";
import { assertCan, type AccountState } from "@/lib/authz";
import { assertFeatureEnabled } from "@/lib/flags";
import { prisma } from "@yolla/db";
import { submitRatingSchema } from "./schemas";
import { submitCourierRating } from "./service";

async function accountState(session: Awaited<ReturnType<typeof requireAuth>>): Promise<AccountState> {
  const profile = await prisma.courierProfile.findUnique({
    where: { userId: session.dbUser.id },
    select: { status: true },
  });
  return { user: session.dbUser, courierStatus: profile?.status ?? null };
}

function toUserMessage(error: unknown): string {
  if (error instanceof DomainError) return error.message;
  if (error && typeof error === "object" && "issues" in error) {
    return "Giriş bilgileri geçersiz.";
  }
  return "İşlem başarısız. Lütfen tekrar deneyin.";
}

export async function submitRatingAction(rawInput: unknown) {
  try {
    const session = await requireAuth();
    await assertFeatureEnabled("ratings");
    assertCan(await accountState(session), "shipment:view");
    const input = submitRatingSchema.parse(rawInput);
    const result = await submitCourierRating({
      fromUserId: session.dbUser.id,
      input,
    });
    if (!result.ok) return { ok: false as const, message: toUserMessage(result.error) };
    revalidatePath("/sender/shipments");
    revalidatePath(`/sender/shipments/${input.shipmentId}`);
    return { ok: true as const, message: "Teşekkürler — değerlendirmen kaydedildi." };
  } catch (error) {
    return { ok: false as const, message: toUserMessage(error) };
  }
}
