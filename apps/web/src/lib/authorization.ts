import { AppRole, type CourierProfile, type User } from "@yolla/db";
import { ForbiddenError } from "@yolla/core";
import { hasRole, type SessionUser } from "@/lib/auth";

export function assertRole(session: SessionUser, role: AppRole): void {
  if (!hasRole(session.dbUser, role)) {
    throw new ForbiddenError(`Bu işlem için ${role} rolü gerekli`);
  }
}

export function assertCanAccessCourierProfile(
  session: SessionUser,
  profile: CourierProfile,
): void {
  const isOwner = profile.userId === session.dbUser.id;
  const isAdmin = hasRole(session.dbUser, AppRole.ADMIN);
  if (!isOwner && !isAdmin) {
    throw new ForbiddenError("Bu kurye profiline erişim yok");
  }
}

export function assertIsSelfOrAdmin(session: SessionUser, userId: string): void {
  const isSelf = session.dbUser.id === userId;
  const isAdmin = hasRole(session.dbUser, AppRole.ADMIN);
  if (!isSelf && !isAdmin) {
    throw new ForbiddenError("Bu kayda erişim yok");
  }
}

export function userHasRole(user: User, role: AppRole): boolean {
  return user.roles.includes(role);
}

export function assertShipmentSender(
  session: SessionUser,
  senderId: string,
): void {
  if (session.dbUser.id !== senderId && !hasRole(session.dbUser, AppRole.ADMIN)) {
    throw new ForbiddenError("Bu gönderiye erişim yok");
  }
}
