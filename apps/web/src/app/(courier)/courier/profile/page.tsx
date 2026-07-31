import Link from "next/link";
import { DomainError } from "@yolla/core";
import { AppRole } from "@yolla/db";
import { getSession, hasRole } from "@/lib/auth";
import { queryMyCourierProfile } from "@/features/couriers/queries";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { Button } from "@/components/ui/Button";
import { ToneBadge } from "@/components/ui/StatusBadge";
import { ChevronRightIcon, HomeIcon, TruckIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const vehicleLabels: Record<string, string> = {
  WALK: "Yaya",
  BIKE: "Bisiklet",
  MOTORCYCLE: "Motosiklet",
  CAR: "Otomobil",
};

export default async function CourierProfilePage() {
  const session = await getSession();
  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 pb-32">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Profil</h1>
        <Button href="/login?next=/courier/profile" size="lg" className="w-full">
          Giriş yap
        </Button>
      </main>
    );
  }

  let profile = null;
  try {
    profile = await queryMyCourierProfile(session);
  } catch (error) {
    console.error(
      "courier profile query failed",
      error instanceof DomainError ? error.code : "unknown",
    );
  }

  const isCourier = hasRole(session.dbUser, AppRole.COURIER);
  const initials = session.email.slice(0, 2).toLocaleUpperCase("tr-TR");

  return (
    <main className="mx-auto max-w-lg px-6 pb-32">
      <div className="flex items-center gap-4 pt-[max(3.5rem,env(safe-area-inset-top))]">
        <span className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#28426E] to-navy text-xl font-extrabold text-ink-inverse">
          {initials}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-ink">
            {session.email}
          </h1>
          <div className="flex gap-1.5 pt-1">
            {isCourier ? (
              <ToneBadge tone="success">Onaylı kurye</ToneBadge>
            ) : profile?.status === "PENDING" ? (
              <ToneBadge tone="warning">Başvuru incelemede</ToneBadge>
            ) : (
              <ToneBadge tone="neutral">Kurye değil</ToneBadge>
            )}
          </div>
        </div>
      </div>

      {profile ? (
        <div className="mt-6 space-y-2.5 rounded-[24px] bg-fill-soft p-5">
          <p className="text-[13px] font-extrabold tracking-[0.06em] text-ink-faint">
            KURYE BİLGİLERİ
          </p>
          <div className="flex items-center gap-3">
            <TruckIcon size={20} className="text-ink-secondary" />
            <span className="text-[15px] font-extrabold text-ink">
              {vehicleLabels[profile.vehicleType] ?? profile.vehicleType}
            </span>
          </div>
          {profile.activeZones.length > 0 ? (
            <p className="text-sm font-semibold text-ink-secondary">
              Bölgeler: {profile.activeZones.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <nav className="pt-5" aria-label="Hesap">
        <ul>
          <li className="border-b border-line">
            <Link href="/sender" className="flex min-h-16 items-center gap-3.5 py-2">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[16px] bg-fill text-ink-secondary">
                <HomeIcon size={20} />
              </span>
              <span className="flex-1 text-[15px] font-extrabold text-ink">
                Gönderici moduna geç
              </span>
              <ChevronRightIcon size={18} className="text-ink-faint" />
            </Link>
          </li>
          <li>
            <Link href="/courier/apply" className="flex min-h-16 items-center gap-3.5 py-2">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[16px] bg-fill text-ink-secondary">
                <TruckIcon size={20} />
              </span>
              <span className="flex-1 text-[15px] font-extrabold text-ink">
                Başvuru durumu ve belgeler
              </span>
              <ChevronRightIcon size={18} className="text-ink-faint" />
            </Link>
          </li>
        </ul>
      </nav>

      <div className="space-y-3 pt-8">
        <LogoutButton />
      </div>
    </main>
  );
}
