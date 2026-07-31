import { AppRole, type User, prisma } from "@yolla/db";
import { UnauthorizedError } from "@yolla/core";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type SessionUser = {
  authId: string;
  email: string;
  dbUser: User;
};

export async function getSession(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const dbUser = await ensureAppUser(user.id, user.email);
  return { authId: user.id, email: user.email, dbUser };
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError("Oturum gerekli");
  }
  return session;
}

/** Upsert Prisma User to match Supabase Auth user id. Default role: SENDER. */
export async function ensureAppUser(authUserId: string, email: string): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();

  return prisma.user.upsert({
    where: { id: authUserId },
    create: {
      id: authUserId,
      email: normalizedEmail,
      roles: [AppRole.SENDER],
    },
    update: {
      email: normalizedEmail,
    },
  });
}

export function hasRole(user: User, role: AppRole): boolean {
  return user.roles.includes(role);
}
