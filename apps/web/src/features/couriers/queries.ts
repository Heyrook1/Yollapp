import { AppRole } from "@yolla/db";
import { requireAuth, type SessionUser } from "@/lib/auth";
import { assertRole } from "@/lib/authorization";
import {
  getCourierProfileByUserId,
  listPendingCourierProfiles,
  type CourierProfileRecord,
} from "./service";

export async function queryMyCourierProfile(
  session?: SessionUser,
): Promise<CourierProfileRecord | null> {
  const s = session ?? (await requireAuth());
  return getCourierProfileByUserId(s.dbUser.id);
}

export async function queryPendingCourierProfiles(): Promise<CourierProfileRecord[]> {
  const session = await requireAuth();
  assertRole(session, AppRole.ADMIN);
  return listPendingCourierProfiles();
}
