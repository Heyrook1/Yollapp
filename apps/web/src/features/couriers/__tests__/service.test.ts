import { describe, expect, it } from "vitest";
import {
  AppRole,
  CourierStatus,
  type VehicleType,
} from "@yolla/db";
import {
  applyForCourier,
  reviewCourierApplication,
  type CourierDb,
  type CourierProfileRecord,
} from "../service";

function createMemoryDb(): CourierDb & {
  profiles: Map<string, CourierProfileRecord>;
  users: Map<string, AppRole[]>;
} {
  const profiles = new Map<string, CourierProfileRecord>();
  const users = new Map<string, AppRole[]>([
    ["user-1", [AppRole.SENDER]],
    ["admin-1", [AppRole.ADMIN]],
  ]);

  const db: CourierDb & {
    profiles: Map<string, CourierProfileRecord>;
    users: Map<string, AppRole[]>;
  } = {
    profiles,
    users,
    findProfileByUserId: async (userId) =>
      [...profiles.values()].find((p) => p.userId === userId) ?? null,
    findProfileById: async (id) => profiles.get(id) ?? null,
    listPendingProfiles: async () =>
      [...profiles.values()]
        .filter((p) => p.status === CourierStatus.PENDING)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    createProfile: async (data) => {
      const now = new Date();
      const record: CourierProfileRecord = {
        id: `profile-${profiles.size + 1}`,
        userId: data.userId,
        status: CourierStatus.PENDING,
        vehicleType: data.vehicleType,
        activeZones: data.activeZones,
        documentPaths: data.documentPaths,
        rejectionReason: null,
        reviewedAt: null,
        reviewedById: null,
        createdAt: now,
        updatedAt: now,
      };
      profiles.set(record.id, record);
      return record;
    },
    updateProfile: async (id, data) => {
      const existing = profiles.get(id);
      if (!existing) {
        throw new Error("missing profile");
      }
      const updated: CourierProfileRecord = {
        ...existing,
        ...data,
        vehicleType: (data.vehicleType ?? existing.vehicleType) as VehicleType,
        status: data.status ?? existing.status,
        updatedAt: new Date(),
      };
      profiles.set(id, updated);
      return updated;
    },
    findUserRoles: async (userId) => users.get(userId) ?? null,
    setUserRoles: async (userId, roles) => {
      users.set(userId, roles);
    },
    transaction: async (fn) => fn(db),
  };

  return db;
}

describe("applyForCourier", () => {
  it("creates a PENDING profile", async () => {
    const db = createMemoryDb();
    const result = await applyForCourier(
      {
        userId: "user-1",
        input: {
          vehicleType: "BIKE",
          activeZones: ["Lefkoşa"],
          documentPaths: [],
        },
      },
      db,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe(CourierStatus.PENDING);
    }
  });

  it("is idempotent when already PENDING", async () => {
    const db = createMemoryDb();
    const first = await applyForCourier(
      {
        userId: "user-1",
        input: { vehicleType: "BIKE", activeZones: ["Lefkoşa"], documentPaths: [] },
      },
      db,
    );
    const second = await applyForCourier(
      {
        userId: "user-1",
        input: { vehicleType: "CAR", activeZones: ["Girne"], documentPaths: [] },
      },
      db,
    );
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.value.id).toBe(first.value.id);
      expect(second.value.vehicleType).toBe("BIKE");
    }
  });
});

describe("reviewCourierApplication", () => {
  it("rejects non-admin reviewers", async () => {
    const db = createMemoryDb();
    await applyForCourier(
      {
        userId: "user-1",
        input: { vehicleType: "BIKE", activeZones: ["Lefkoşa"], documentPaths: [] },
      },
      db,
    );
    const profile = [...db.profiles.values()][0];
    const result = await reviewCourierApplication(
      {
        adminUserId: "user-1",
        adminRoles: [AppRole.SENDER],
        input: { profileId: profile!.id, decision: "APPROVE" },
      },
      db,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("approves and adds COURIER role", async () => {
    const db = createMemoryDb();
    await applyForCourier(
      {
        userId: "user-1",
        input: { vehicleType: "BIKE", activeZones: ["Lefkoşa"], documentPaths: [] },
      },
      db,
    );
    const profile = [...db.profiles.values()][0];
    const result = await reviewCourierApplication(
      {
        adminUserId: "admin-1",
        adminRoles: [AppRole.ADMIN],
        input: { profileId: profile!.id, decision: "APPROVE" },
      },
      db,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe(CourierStatus.APPROVED);
    }
    expect(db.users.get("user-1")).toContain(AppRole.COURIER);
  });

  it("rejects without granting COURIER role", async () => {
    const db = createMemoryDb();
    await applyForCourier(
      {
        userId: "user-1",
        input: { vehicleType: "BIKE", activeZones: ["Lefkoşa"], documentPaths: [] },
      },
      db,
    );
    const profile = [...db.profiles.values()][0];
    const result = await reviewCourierApplication(
      {
        adminUserId: "admin-1",
        adminRoles: [AppRole.ADMIN],
        input: {
          profileId: profile!.id,
          decision: "REJECT",
          rejectionReason: "Eksik belge",
        },
      },
      db,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe(CourierStatus.REJECTED);
    }
    expect(db.users.get("user-1")).not.toContain(AppRole.COURIER);
  });
});
