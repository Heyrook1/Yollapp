import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { AppRole, prisma, type User } from "@yolla/db";
import { DomainError } from "@yolla/core";
import { ensureAppUser } from "@/lib/auth";
import type { AccountState } from "@/lib/authz";
import { getEnv } from "@/lib/env";

/**
 * Mobil istemci kimlik doğrulaması.
 *
 * Web tarayıcısı çerez tabanlı Supabase SSR oturumu kullanır; React Native
 * çerez taşımaz, bu yüzden `Authorization: Bearer <access_token>` gönderir.
 * Token her istekte Supabase'e doğrulatılır — istemcinin iddiasına güvenilmez.
 */

export type ApiSession = {
  authId: string;
  email: string;
  dbUser: User;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly userMessage: string,
  ) {
    super(userMessage);
    this.name = "ApiError";
  }
}

export async function authenticateRequest(request: Request): Promise<ApiSession> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Oturum gerekli.");
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    throw new ApiError(401, "Oturum gerekli.");
  }

  const env = getEnv();
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Token'ı Supabase'e doğrulat — imza/expiry kontrolü orada yapılır.
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    // Hesap sayımını önlemek için genel mesaj.
    throw new ApiError(401, "Oturum geçersiz veya süresi dolmuş.");
  }

  const dbUser = await ensureAppUser(data.user.id, data.user.email);
  return { authId: data.user.id, email: data.user.email, dbUser };
}

/** Yetki kararı için kurye durumunu da içeren hesap görünümü. */
export async function accountStateFor(session: ApiSession): Promise<AccountState> {
  const profile = await prisma.courierProfile.findUnique({
    where: { userId: session.dbUser.id },
    select: { status: true },
  });
  return { user: session.dbUser, courierStatus: profile?.status ?? null };
}

export function isAdmin(session: ApiSession): boolean {
  return session.dbUser.roles.includes(AppRole.ADMIN);
}

/** Hata → HTTP yanıtı. Ham hata/stack istemciye SIZDIRILMAZ (CLAUDE.md §7). */
export function toApiResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.userMessage }, { status: error.status });
  }
  if (error instanceof DomainError) {
    const status =
      error.code === "UNAUTHORIZED"
        ? 401
        : error.code === "FORBIDDEN"
          ? 403
          : error.code === "NOT_FOUND"
            ? 404
            : error.code === "CONFLICT"
              ? 409
              : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  console.error("api route error", {
    error: error instanceof Error ? error.name : "unknown",
  });
  return NextResponse.json(
    { error: "Bir hata oluştu. Lütfen tekrar deneyin." },
    { status: 500 },
  );
}
