import Link from "next/link";
import { DomainError } from "@yolla/core";
import { prisma } from "@yolla/db";
import { getSession } from "@/lib/auth";
import { ApplyWizard } from "@/features/couriers/components/ApplyWizard";
import { queryMyCourierProfile } from "@/features/couriers/queries";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";
import { ToneBadge } from "@/components/ui/StatusBadge";
import { CheckIcon, ShieldIcon, TruckIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function CourierApplyPage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 pb-32">
        <span className="flex size-16 items-center justify-center rounded-[20px] bg-accent-soft text-warning-deep">
          <TruckIcon size={30} />
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Teslimat yaparak kazan
        </h1>
        <p className="font-semibold text-ink-secondary">
          Kendi programınla çalış. Başvuru için önce hesap oluştur.
        </p>
        <Button href="/signup?next=/courier/apply" size="lg" className="w-full">
          Hesap oluştur
        </Button>
        <Link
          href="/login?next=/courier/apply"
          className="text-center text-sm font-bold text-ink-secondary"
        >
          Zaten hesabım var — giriş yap
        </Link>
      </main>
    );
  }

  let profile = null;
  let loadError = false;
  try {
    profile = await queryMyCourierProfile(session);
  } catch (error) {
    console.error(
      "courier profile query failed",
      error instanceof DomainError ? error.code : "unknown",
    );
    loadError = true;
  }

  let zoneNames: string[] = [];
  try {
    const zones = await prisma.zone.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { name: true },
    });
    zoneNames = zones.map((z) => z.name);
  } catch {
    // Bölge önerileri yüklenemezse serbest metin girişi yeterli.
  }

  return (
    <main className="mx-auto max-w-lg px-6 pb-32 pt-[max(3.5rem,env(safe-area-inset-top))]">
      {loadError ? (
        <ErrorState title="Başvuru durumu yüklenemedi" />
      ) : profile?.status === "PENDING" ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-warning-soft text-warning-deep">
            <ShieldIcon size={34} />
          </span>
          <ToneBadge tone="warning">İncelemede</ToneBadge>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Başvurun incelemede
          </h1>
          <p className="max-w-xs font-semibold text-ink-secondary">
            Bilgilerini kontrol ediyoruz. Onaylandığında burada ve e-posta ile haber vereceğiz.
          </p>
          <Button href="/courier/jobs" variant="soft" className="w-full">
            Kurye paneline dön
          </Button>
        </div>
      ) : profile?.status === "APPROVED" ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-success-soft text-success-deep">
            <CheckIcon size={36} strokeWidth={3} />
          </span>
          <ToneBadge tone="success">Onaylı kurye</ToneBadge>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Hazırsın!</h1>
          <p className="max-w-xs font-semibold text-ink-secondary">
            Kurye hesabın aktif. Açık işleri görüntüleyip hemen kazanmaya başlayabilirsin.
          </p>
          <Button href="/courier/jobs" size="lg" className="w-full">
            Açık işlere git
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {profile?.status === "REJECTED" ? (
            <div className="rounded-[20px] bg-danger-soft p-4.5">
              <p className="text-[15px] font-extrabold text-ink">Önceki başvurun onaylanmadı</p>
              {profile.rejectionReason ? (
                <p className="pt-1 text-sm font-bold text-danger">
                  Neden: {profile.rejectionReason}
                </p>
              ) : null}
              <p className="pt-1 text-sm font-semibold text-ink-secondary">
                Bilgilerini güncelleyip yeniden başvurabilirsin.
              </p>
            </div>
          ) : null}
          <ApplyWizard zoneNames={zoneNames} />
        </div>
      )}
    </main>
  );
}
