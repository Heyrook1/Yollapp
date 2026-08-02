import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  isTrackableStatus,
  isValidCoordinate,
  locationFreshness,
  err,
  ok,
  type Result,
} from "@yolla/core";
import { CourierStatus, prisma } from "@yolla/db";
import type { LocationUpdateInput } from "./schemas";
import { syncPresenceFromJobLocation } from "./presence-service";

const SESSION_TTL_HOURS = 24;

export async function ensureTrackingSession(params: {
  shipmentId: string;
  driverId: string;
}): Promise<Result<{ sessionId: string }>> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: params.shipmentId },
    include: {
      courier: { include: { courierProfile: true } },
    },
  });
  if (!shipment) return err(new NotFoundError("Gönderi bulunamadı."));
  if (shipment.courierId !== params.driverId) {
    return err(new ForbiddenError("Bu iş size atanmamış."));
  }
  if (!isTrackableStatus(shipment.status)) {
    return err(new ConflictError("Bu aşamada konum paylaşımı açılamaz."));
  }

  const profile = shipment.courier?.courierProfile;
  if (!profile || profile.status !== CourierStatus.APPROVED) {
    return err(new ForbiddenError("Onaylı kurye değilsiniz."));
  }
  if (shipment.isTaxiCargo) {
    if (profile.vehicleType !== "TAXI" || !profile.taxiCargoEnabled) {
      return err(new ForbiddenError("Taksi kargo yetkiniz yok."));
    }
    if (profile.carryingPassenger) {
      return err(new ConflictError("Yolcu taşırken kargo teslimatı yapılamaz."));
    }
  }

  const existing = await prisma.deliveryTrackingSession.findFirst({
    where: {
      shipmentId: params.shipmentId,
      driverId: params.driverId,
      status: "ACTIVE",
    },
  });
  if (existing) {
    return ok({ sessionId: existing.id });
  }

  const session = await prisma.deliveryTrackingSession.create({
    data: {
      shipmentId: params.shipmentId,
      driverId: params.driverId,
      expiresAt: new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000),
    },
  });
  return ok({ sessionId: session.id });
}

export async function endTrackingSessionsForShipment(shipmentId: string): Promise<number> {
  try {
    const result = await prisma.deliveryTrackingSession.updateMany({
      where: { shipmentId, status: "ACTIVE" },
      data: { status: "ENDED", endedAt: new Date() },
    });
    return result.count;
  } catch (error) {
    // Tablo henüz migrate edilmemişse / test ortamı — ana teslimat akışını bozma.
    console.error("endTrackingSessionsForShipment failed", {
      shipmentId,
      error: error instanceof Error ? error.name : "unknown",
    });
    return 0;
  }
}

export async function ingestDriverLocation(
  params: LocationUpdateInput & { driverId: string },
): Promise<Result<{ accepted: boolean; freshness: "live" }>> {
  if (!isValidCoordinate(params.latitude, params.longitude)) {
    return err(new ConflictError("Koordinat geçersiz."));
  }

  const shipment = await prisma.shipment.findUnique({
    where: { id: params.jobId },
  });
  if (!shipment) return err(new NotFoundError("İş bulunamadı."));
  if (shipment.courierId !== params.driverId) {
    return err(new ForbiddenError("Bu iş size atanmamış."));
  }
  if (!isTrackableStatus(shipment.status)) {
    return err(new ConflictError("İş tamamlandı veya konum kabul edilmiyor."));
  }

  const session = await prisma.deliveryTrackingSession.findFirst({
    where: {
      shipmentId: params.jobId,
      driverId: params.driverId,
      status: "ACTIVE",
    },
  });
  if (!session || session.expiresAt < new Date()) {
    return err(new ConflictError("Aktif takip oturumu yok. Konum paylaşımını başlatın."));
  }

  const current = await prisma.driverCurrentLocation.findUnique({
    where: { shipmentId: params.jobId },
  });
  if (current && params.sequenceNumber <= current.sequenceNumber) {
    // Idempotent / stale sequence — sessiz kabul, yeniden yazma.
    return ok({ accepted: false, freshness: "live" });
  }

  const recordedAt = params.deviceTimestamp
    ? new Date(params.deviceTimestamp)
    : new Date();
  const receivedAt = new Date();

  await prisma.$transaction([
    prisma.driverCurrentLocation.upsert({
      where: { shipmentId: params.jobId },
      create: {
        driverId: params.driverId,
        shipmentId: params.jobId,
        latitude: params.latitude,
        longitude: params.longitude,
        accuracyMeters: params.accuracyMeters ?? null,
        heading: params.heading ?? null,
        speedMetersPerSecond: params.speedMetersPerSecond ?? null,
        sequenceNumber: params.sequenceNumber,
        deviceTimestamp: params.deviceTimestamp ? new Date(params.deviceTimestamp) : null,
        recordedAt,
        receivedAt,
      },
      update: {
        latitude: params.latitude,
        longitude: params.longitude,
        accuracyMeters: params.accuracyMeters ?? null,
        heading: params.heading ?? null,
        speedMetersPerSecond: params.speedMetersPerSecond ?? null,
        sequenceNumber: params.sequenceNumber,
        deviceTimestamp: params.deviceTimestamp ? new Date(params.deviceTimestamp) : null,
        recordedAt,
        receivedAt,
      },
    }),
    prisma.driverLocationHistory.create({
      data: {
        driverId: params.driverId,
        shipmentId: params.jobId,
        latitude: params.latitude,
        longitude: params.longitude,
        accuracyMeters: params.accuracyMeters ?? null,
        heading: params.heading ?? null,
        speedMetersPerSecond: params.speedMetersPerSecond ?? null,
        sequenceNumber: params.sequenceNumber,
        recordedAt,
        receivedAt,
      },
    }),
    prisma.deliveryTrackingSession.update({
      where: { id: session.id },
      data: { lastLocationAt: receivedAt },
    }),
  ]);

  // Opt-in presence açıkken gönderici haritasında ON_JOB olarak yansıt.
  await syncPresenceFromJobLocation({
    courierUserId: params.driverId,
    latitude: params.latitude,
    longitude: params.longitude,
    heading: params.heading,
    accuracyMeters: params.accuracyMeters,
    sequenceNumber: params.sequenceNumber,
  });

  return ok({ accepted: true, freshness: "live" });
}

export async function getLiveLocationForShipment(shipmentId: string) {
  const loc = await prisma.driverCurrentLocation.findUnique({
    where: { shipmentId },
  });
  if (!loc) return null;
  const freshness = locationFreshness(loc.receivedAt);
  return {
    latitude: loc.latitude,
    longitude: loc.longitude,
    accuracyMeters: loc.accuracyMeters,
    heading: loc.heading,
    speedMetersPerSecond: loc.speedMetersPerSecond,
    recordedAt: loc.recordedAt.toISOString(),
    receivedAt: loc.receivedAt.toISOString(),
    freshness,
    sequenceNumber: loc.sequenceNumber,
  };
}
