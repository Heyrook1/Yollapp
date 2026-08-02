import {
  ConflictError,
  ForbiddenError,
  deriveCourierActivity,
  isInsideServiceBounds,
  isPresenceListable,
  isValidCoordinate,
  locationFreshness,
  err,
  ok,
  type Result,
  type CourierActivityCode,
} from "@yolla/core";
import {
  CourierStatus,
  prisma,
  type CourierActivity,
  type VehicleType,
} from "@yolla/db";
import type { PresenceUpdateInput } from "./schemas";

const TRACKABLE = ["MATCHED", "PICKED_UP", "IN_TRANSIT"] as const;

async function hasActiveTrackableJob(courierUserId: string): Promise<boolean> {
  const count = await prisma.shipment.count({
    where: {
      courierId: courierUserId,
      status: { in: [...TRACKABLE] },
    },
  });
  return count > 0;
}

async function loadApprovedProfile(courierUserId: string) {
  return prisma.courierProfile.findUnique({
    where: { userId: courierUserId },
    select: {
      status: true,
      vehicleType: true,
      carryingPassenger: true,
    },
  });
}

export type PresencePublicDto = {
  id: string;
  lat: number;
  lng: number;
  heading: number | null;
  vehicleType: VehicleType;
  activity: CourierActivity;
  freshness: "live" | "stale";
};

/**
 * Kurye varlık upsert — opt-in paylaşım + konum.
 * Log'a koordinat yazılmaz.
 */
export async function upsertCourierPresence(params: {
  courierUserId: string;
  input: PresenceUpdateInput;
}): Promise<
  Result<{
    sharingEnabled: boolean;
    activity: CourierActivityCode | null;
    lastSeenAt: string | null;
  }>
> {
  const profile = await loadApprovedProfile(params.courierUserId);
  if (!profile || profile.status !== CourierStatus.APPROVED) {
    return err(new ForbiddenError("Onaylı kurye değilsiniz."));
  }

  const existing = await prisma.courierPresence.findUnique({
    where: { courierUserId: params.courierUserId },
  });

  const sharingEnabled =
    params.input.sharingEnabled ?? existing?.sharingEnabled ?? false;

  if (
    params.input.latitude !== undefined &&
    params.input.longitude !== undefined
  ) {
    if (!isValidCoordinate(params.input.latitude, params.input.longitude)) {
      return err(new ConflictError("Koordinat geçersiz."));
    }
    if (
      !isInsideServiceBounds({
        lat: params.input.latitude,
        lng: params.input.longitude,
      })
    ) {
      return err(new ConflictError("Konum hizmet bölgesi dışında."));
    }
  }

  // Paylaşımı kapat — konum gerekmez; satır yoksa yazma.
  if (!sharingEnabled) {
    if (existing) {
      await prisma.courierPresence.update({
        where: { courierUserId: params.courierUserId },
        data: { sharingEnabled: false },
      });
    }
    console.info("courier presence sharing off", {
      courierUserId: params.courierUserId,
    });
    return ok({
      sharingEnabled: false,
      activity: null,
      lastSeenAt: null,
    });
  }

  const lat = params.input.latitude ?? existing?.latitude;
  const lng = params.input.longitude ?? existing?.longitude;
  if (lat === undefined || lng === undefined) {
    return err(
      new ConflictError("Paylaşımı açmak için konum gerekli."),
    );
  }

  if (
    params.input.sequenceNumber !== undefined &&
    existing &&
    params.input.sequenceNumber <= existing.sequenceNumber
  ) {
    return ok({
      sharingEnabled: true,
      activity: existing.activity,
      lastSeenAt: existing.lastSeenAt.toISOString(),
    });
  }

  const onJob = await hasActiveTrackableJob(params.courierUserId);
  const activity = deriveCourierActivity({
    sharingEnabled: true,
    carryingPassenger: profile.carryingPassenger,
    hasActiveTrackableJob: onJob,
    forceBusy: params.input.forceBusy === true,
  });
  if (!activity) {
    return err(new ConflictError("Varlık durumu türetilemedi."));
  }

  const now = new Date();
  const seq =
    params.input.sequenceNumber ?? (existing?.sequenceNumber ?? 0) + 1;

  const row = await prisma.courierPresence.upsert({
    where: { courierUserId: params.courierUserId },
    create: {
      courierUserId: params.courierUserId,
      latitude: lat,
      longitude: lng,
      heading: params.input.heading ?? null,
      accuracyMeters: params.input.accuracyMeters ?? null,
      activity,
      sharingEnabled: true,
      vehicleType: profile.vehicleType,
      sequenceNumber: seq,
      lastSeenAt: now,
    },
    update: {
      latitude: lat,
      longitude: lng,
      heading: params.input.heading ?? existing?.heading ?? null,
      accuracyMeters:
        params.input.accuracyMeters ?? existing?.accuracyMeters ?? null,
      activity,
      sharingEnabled: true,
      vehicleType: profile.vehicleType,
      sequenceNumber: seq,
      lastSeenAt: now,
    },
  });

  console.info("courier presence upsert", {
    courierUserId: params.courierUserId,
    activity: row.activity,
  });

  return ok({
    sharingEnabled: true,
    activity: row.activity,
    lastSeenAt: row.lastSeenAt.toISOString(),
  });
}

/** Aktif iş konum ingest sonrası presence ON_JOB (paylaşım açıksa veya zorla açık). */
export async function syncPresenceFromJobLocation(params: {
  courierUserId: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
  accuracyMeters?: number | null;
  sequenceNumber: number;
}): Promise<void> {
  try {
    const profile = await loadApprovedProfile(params.courierUserId);
    if (!profile || profile.status !== CourierStatus.APPROVED) return;

    const existing = await prisma.courierPresence.findUnique({
      where: { courierUserId: params.courierUserId },
    });
    // Opt-in: yalnızca paylaşım açıkken haritada görünür.
    if (!existing?.sharingEnabled) return;

    const activity = deriveCourierActivity({
      sharingEnabled: true,
      carryingPassenger: profile.carryingPassenger,
      hasActiveTrackableJob: true,
    });
    if (!activity) return;

    await prisma.courierPresence.update({
      where: { courierUserId: params.courierUserId },
      data: {
        latitude: params.latitude,
        longitude: params.longitude,
        heading: params.heading ?? null,
        accuracyMeters: params.accuracyMeters ?? null,
        activity,
        vehicleType: profile.vehicleType,
        sequenceNumber: Math.max(
          existing.sequenceNumber + 1,
          params.sequenceNumber,
        ),
        lastSeenAt: new Date(),
      },
    });
  } catch (error) {
    console.error("syncPresenceFromJobLocation failed", {
      courierUserId: params.courierUserId,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

/**
 * Yerel/demo: @yolla.test kuryelerinin presence'ini taze tut.
 * Gerçek GPS heartbeat yokken seed pinleri 120 sn sonra kaybolmasın.
 * Production'da asla çalışmaz.
 */
async function keepDemoPresenceAlive(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  try {
    await prisma.courierPresence.updateMany({
      where: {
        sharingEnabled: true,
        courier: { email: { endsWith: "@yolla.test" } },
      },
      data: { lastSeenAt: new Date() },
    });
  } catch (error) {
    console.error("keepDemoPresenceAlive failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

export async function listNearbyCouriers(params: {
  south: number;
  west: number;
  north: number;
  east: number;
  activity?: CourierActivity[];
  vehicleType?: VehicleType[];
}): Promise<PresencePublicDto[]> {
  if (params.south > params.north || params.west > params.east) {
    throw new ConflictError("Geçersiz harita alanı.");
  }

  await keepDemoPresenceAlive();

  const offlineCutoff = new Date(
    Date.now() - 120_000, // LOCATION_POLICY.OFFLINE_AFTER_SECONDS
  );

  const rows = await prisma.courierPresence.findMany({
    where: {
      sharingEnabled: true,
      lastSeenAt: { gte: offlineCutoff },
      latitude: { gte: params.south, lte: params.north },
      longitude: { gte: params.west, lte: params.east },
      ...(params.activity?.length
        ? { activity: { in: params.activity } }
        : {}),
      ...(params.vehicleType?.length
        ? { vehicleType: { in: params.vehicleType } }
        : {}),
    },
    take: 200,
    orderBy: { lastSeenAt: "desc" },
  });

  const now = new Date();
  const out: PresencePublicDto[] = [];
  for (const row of rows) {
    if (
      !isPresenceListable({
        sharingEnabled: row.sharingEnabled,
        lastSeenAt: row.lastSeenAt,
        now,
      })
    ) {
      continue;
    }
    const freshness = locationFreshness(row.lastSeenAt, now);
    if (freshness === "offline") continue;
    out.push({
      id: row.id,
      lat: row.latitude,
      lng: row.longitude,
      heading: row.heading,
      vehicleType: row.vehicleType,
      activity: row.activity,
      freshness,
    });
  }
  return out;
}

export async function getMyPresence(courierUserId: string) {
  const row = await prisma.courierPresence.findUnique({
    where: { courierUserId },
  });
  if (!row) {
    return { sharingEnabled: false, activity: null as CourierActivityCode | null };
  }
  return {
    sharingEnabled: row.sharingEnabled,
    activity: row.sharingEnabled ? row.activity : null,
    lastSeenAt: row.lastSeenAt.toISOString(),
  };
}
