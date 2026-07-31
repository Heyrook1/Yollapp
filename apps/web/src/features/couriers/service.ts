import {
  AppRole,
  CourierStatus,
  prisma,
  type CourierProfile,
  type Prisma,
  type VehicleType,
} from "@yolla/db";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  err,
  ok,
  type Result,
} from "@yolla/core";
import type { ApplyCourierInput, ReviewCourierInput } from "./schemas";

export type CourierProfileRecord = Pick<
  CourierProfile,
  | "id"
  | "userId"
  | "status"
  | "vehicleType"
  | "activeZones"
  | "documentPaths"
  | "rejectionReason"
  | "reviewedAt"
  | "reviewedById"
  | "createdAt"
  | "updatedAt"
>;

type PrismaClientLike = {
  courierProfile: {
    findUnique: (args: {
      where: { userId?: string; id?: string };
    }) => Promise<CourierProfileRecord | null>;
    findMany: (args: {
      where: { status: CourierStatus };
      orderBy: { createdAt: "asc" };
    }) => Promise<CourierProfileRecord[]>;
    create: (args: {
      data: {
        userId: string;
        status: CourierStatus;
        vehicleType: VehicleType;
        activeZones: string[];
        documentPaths: string[];
      };
    }) => Promise<CourierProfileRecord>;
    update: (args: {
      where: { id: string };
      data: Prisma.CourierProfileUpdateInput;
    }) => Promise<CourierProfileRecord>;
  };
  user: {
    findUnique: (args: {
      where: { id: string };
      select: { roles: true };
    }) => Promise<{ roles: AppRole[] } | null>;
    update: (args: {
      where: { id: string };
      data: { roles: AppRole[] };
    }) => Promise<unknown>;
  };
};

export type CourierDb = {
  findProfileByUserId: (userId: string) => Promise<CourierProfileRecord | null>;
  findProfileById: (id: string) => Promise<CourierProfileRecord | null>;
  listPendingProfiles: () => Promise<CourierProfileRecord[]>;
  createProfile: (data: {
    userId: string;
    vehicleType: VehicleType;
    activeZones: string[];
    documentPaths: string[];
  }) => Promise<CourierProfileRecord>;
  updateProfile: (
    id: string,
    data: Partial<{
      status: CourierStatus;
      vehicleType: VehicleType;
      activeZones: string[];
      documentPaths: string[];
      rejectionReason: string | null;
      reviewedAt: Date | null;
      reviewedById: string | null;
    }>,
  ) => Promise<CourierProfileRecord>;
  findUserRoles: (userId: string) => Promise<AppRole[] | null>;
  setUserRoles: (userId: string, roles: AppRole[]) => Promise<void>;
  transaction: <T>(fn: (tx: CourierDb) => Promise<T>) => Promise<T>;
};

function createCourierDb(
  client: PrismaClientLike,
  runTransaction?: <T>(fn: (tx: CourierDb) => Promise<T>) => Promise<T>,
): CourierDb {
  const db: CourierDb = {
    findProfileByUserId: (userId) =>
      client.courierProfile.findUnique({ where: { userId } }),
    findProfileById: (id) => client.courierProfile.findUnique({ where: { id } }),
    listPendingProfiles: () =>
      client.courierProfile.findMany({
        where: { status: CourierStatus.PENDING },
        orderBy: { createdAt: "asc" },
      }),
    createProfile: (data) =>
      client.courierProfile.create({
        data: {
          userId: data.userId,
          status: CourierStatus.PENDING,
          vehicleType: data.vehicleType,
          activeZones: data.activeZones,
          documentPaths: data.documentPaths,
        },
      }),
    updateProfile: (id, data) =>
      client.courierProfile.update({ where: { id }, data }),
    findUserRoles: async (userId) => {
      const user = await client.user.findUnique({
        where: { id: userId },
        select: { roles: true },
      });
      return user?.roles ?? null;
    },
    setUserRoles: async (userId, roles) => {
      await client.user.update({ where: { id: userId }, data: { roles } });
    },
    transaction: async (fn) => {
      if (runTransaction) {
        return runTransaction(fn);
      }
      return fn(db);
    },
  };
  return db;
}

export const prismaCourierDb: CourierDb = createCourierDb(
  prisma as unknown as PrismaClientLike,
  (fn) =>
    prisma.$transaction(async (tx) => {
      const txDb = createCourierDb(tx as unknown as PrismaClientLike);
      return fn(txDb);
    }),
);

export type ApplyCourierParams = {
  userId: string;
  input: ApplyCourierInput;
};

export async function applyForCourier(
  params: ApplyCourierParams,
  db: CourierDb = prismaCourierDb,
): Promise<Result<CourierProfileRecord>> {
  const existing = await db.findProfileByUserId(params.userId);

  if (existing?.status === CourierStatus.PENDING) {
    return ok(existing);
  }
  if (existing?.status === CourierStatus.APPROVED) {
    return err(new ConflictError("Courier profile already approved"));
  }

  const vehicleType = params.input.vehicleType as VehicleType;

  if (existing?.status === CourierStatus.REJECTED) {
    const updated = await db.updateProfile(existing.id, {
      status: CourierStatus.PENDING,
      vehicleType,
      activeZones: params.input.activeZones,
      documentPaths: params.input.documentPaths,
      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
    });
    return ok(updated);
  }

  const created = await db.createProfile({
    userId: params.userId,
    vehicleType,
    activeZones: params.input.activeZones,
    documentPaths: params.input.documentPaths,
  });
  return ok(created);
}

export type ReviewCourierParams = {
  adminUserId: string;
  adminRoles: AppRole[];
  input: ReviewCourierInput;
};

export async function reviewCourierApplication(
  params: ReviewCourierParams,
  db: CourierDb = prismaCourierDb,
): Promise<Result<CourierProfileRecord>> {
  if (!params.adminRoles.includes(AppRole.ADMIN)) {
    return err(new ForbiddenError("Admin role required"));
  }

  if (params.input.decision === "REJECT" && !params.input.rejectionReason) {
    return err(new ValidationError("Rejection reason required"));
  }

  const profile = await db.findProfileById(params.input.profileId);
  if (!profile) {
    return err(new NotFoundError("Courier profile not found"));
  }
  if (profile.status !== CourierStatus.PENDING) {
    return err(new ConflictError("Only pending applications can be reviewed"));
  }

  if (params.input.decision === "APPROVE") {
    try {
      const updated = await db.transaction(async (tx) => {
        const approved = await tx.updateProfile(profile.id, {
          status: CourierStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedById: params.adminUserId,
          rejectionReason: null,
        });

        const roles = await tx.findUserRoles(profile.userId);
        if (!roles) {
          throw new NotFoundError("User not found");
        }
        const nextRoles = Array.from(new Set([...roles, AppRole.COURIER]));
        await tx.setUserRoles(profile.userId, nextRoles);
        return approved;
      });
      return ok(updated);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return err(error);
      }
      throw error;
    }
  }

  const rejected = await db.updateProfile(profile.id, {
    status: CourierStatus.REJECTED,
    rejectionReason: params.input.rejectionReason ?? null,
    reviewedAt: new Date(),
    reviewedById: params.adminUserId,
  });
  return ok(rejected);
}

export async function listPendingCourierProfiles(
  db: CourierDb = prismaCourierDb,
): Promise<CourierProfileRecord[]> {
  return db.listPendingProfiles();
}

export async function getCourierProfileByUserId(
  userId: string,
  db: CourierDb = prismaCourierDb,
): Promise<CourierProfileRecord | null> {
  return db.findProfileByUserId(userId);
}
