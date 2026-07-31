import Link from "next/link";
import { AppRole } from "@yolla/db";
import { getSession, hasRole } from "@/lib/auth";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { Button } from "@/components/ui/Button";
import { ToneBadge } from "@/components/ui/StatusBadge";
import {
  BriefcaseIcon,
  ChevronRightIcon,
  ShieldIcon,
  TruckIcon,
} from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function SenderProfilePage() {
  const session = await getSession();
  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 pb-32">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Profil</h1>
        <Button href="/login?next=/sender/profile" size="lg" className="w-full">
          Giriş yap
        </Button>
      </main>
    );
  }

  const isCourier = hasRole(session.dbUser, AppRole.COURIER);
  const isAdmin = hasRole(session.dbUser, AppRole.ADMIN);
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
            <ToneBadge tone="primary">Gönderici</ToneBadge>
            {isCourier ? <ToneBadge tone="success">Kurye</ToneBadge> : null}
            {isAdmin ? <ToneBadge tone="warning">Admin</ToneBadge> : null}
          </div>
        </div>
      </div>

      <nav className="pt-6" aria-label="Hesap">
        <ul>
          <ProfileLink
            href="/courier/apply"
            icon={<TruckIcon size={20} />}
            title={isCourier ? "Kurye moduna geç" : "Kurye ol — teslimatla kazan"}
            detail={isCourier ? "Onaylı kurye hesabın hazır" : "Başvur, onaydan sonra iş almaya başla"}
          />
          <ProfileLink
            href="/business"
            icon={<BriefcaseIcon size={20} />}
            title="İşletme modu"
            detail="Toplu gönderi ve raporlar"
          />
          {isAdmin ? (
            <ProfileLink
              href="/admin"
              icon={<ShieldIcon size={20} />}
              title="Operasyon paneli"
              detail="Yalnızca yetkili hesaplar"
            />
          ) : null}
        </ul>
      </nav>

      <div className="space-y-3 pt-8">
        <LogoutButton />
        <p className="text-center text-xs font-semibold text-ink-faint">
          YOLLA · Her yere. Her şeyi. Daha hızlı.
        </p>
      </div>
    </main>
  );
}

function ProfileLink({
  href,
  icon,
  title,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <li className="border-b border-line last:border-0">
      <Link href={href} className="flex min-h-16 items-center gap-3.5 py-2">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[16px] bg-fill text-ink-secondary">
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-extrabold text-ink">{title}</span>
          <span className="truncate text-xs font-semibold text-ink-faint">{detail}</span>
        </span>
        <ChevronRightIcon size={18} className="text-ink-faint" />
      </Link>
    </li>
  );
}
