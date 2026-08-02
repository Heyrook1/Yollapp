import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  err,
  ok,
  type Result,
} from "@yolla/core";
import { prisma } from "@yolla/db";
import type { SubmitRatingInput } from "./schemas";

/** Gönderici → kurye, gönderi başına tek puan. */
export async function submitCourierRating(params: {
  fromUserId: string;
  input: SubmitRatingInput;
}): Promise<Result<{ ratingId: string; ratingAvg: number; ratingCount: number }>> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: params.input.shipmentId },
    select: {
      id: true,
      senderId: true,
      courierId: true,
      status: true,
      rating: { select: { id: true } },
    },
  });
  if (!shipment) return err(new NotFoundError("Gönderi bulunamadı."));
  if (shipment.senderId !== params.fromUserId) {
    return err(new ForbiddenError("Yalnızca gönderici değerlendirebilir."));
  }
  if (shipment.status !== "DELIVERED") {
    return err(new ConflictError("Yalnızca teslim edilmiş gönderi puanlanır."));
  }
  if (!shipment.courierId) {
    return err(new ConflictError("Kurye atanmamış."));
  }
  if (shipment.rating) {
    return err(new ConflictError("Bu gönderi zaten değerlendirildi."));
  }

  const result = await prisma.$transaction(async (tx) => {
    const rating = await tx.rating.create({
      data: {
        shipmentId: shipment.id,
        fromUserId: params.fromUserId,
        toUserId: shipment.courierId!,
        stars: params.input.stars,
        tags: params.input.tags,
        comment: params.input.comment ?? null,
      },
    });

    const agg = await tx.rating.aggregate({
      where: { toUserId: shipment.courierId! },
      _avg: { stars: true },
      _count: { _all: true },
    });
    const ratingAvg = agg._avg.stars ?? 0;
    const ratingCount = agg._count._all;

    await tx.courierProfile.update({
      where: { userId: shipment.courierId! },
      data: { ratingAvg, ratingCount },
    });

    return { ratingId: rating.id, ratingAvg, ratingCount };
  });

  return ok(result);
}

export async function getPublicCourierCard(courierUserId: string) {
  const profile = await prisma.courierProfile.findUnique({
    where: { userId: courierUserId },
    select: {
      displayName: true,
      vehicleType: true,
      ratingAvg: true,
      ratingCount: true,
      status: true,
    },
  });
  if (!profile || profile.status !== "APPROVED") return null;
  return {
    displayName: profile.displayName ?? "Yolla Kurye",
    vehicleType: profile.vehicleType,
    ratingAvg: profile.ratingCount > 0 ? profile.ratingAvg : null,
    ratingCount: profile.ratingCount,
  };
}
