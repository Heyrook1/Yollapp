import Link from "next/link";
import { DomainError } from "@yolla/core";
import { AppRole } from "@yolla/db";
import { getSession, hasRole } from "@/lib/auth";
import { JobOfferList } from "@/features/shipments/components/JobOfferList";
import { queryAvailableJobs, queryCourierWallet } from "@/features/shipments/queries";
import { queryMyCourierProfile } from "@/features/couriers/queries";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";
import { ToneBadge } from "@/components/ui/StatusBadge";
import { CheckIcon, ClockIcon, StarIcon, TruckIcon } from "@/components/ui/icons";
import { CourierOnlineToggle } from "@/features/maps/components/CourierOnlineToggle";

export const dynamic = "force-dynamic";

export default async function CourierHomePage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 pb-32">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Kurye paneli</h1>
        <p className="font-semibold text-ink-secondary">İşleri görmek için giriş yap.</p>
        <Button href="/login?next=/courier/jobs" size="lg" className="w-full">
          Giriş yap
        </Button>
      </main>
    );
  }

  if (!hasRole(session.dbUser, AppRole.COURIER)) {
    let profile = null;
    try {
      profile = await queryMyCourierProfile(session);
    } catch (error) {
      console.error(
        "courier profile query failed",
        error instanceof DomainError ? error.code : "unknown",
      );
    }

    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col px-6 pb-32">
        <div className="flex flex-1 flex-col justify-center gap-4">
          <span className="flex size-16 items-center justify-center rounded-[20px] bg-accent-soft text-warning-deep">
            <TruckIcon size={30} />
          </span>
          {profile?.status === "PENDING" ? (
            <>
              <h1 className="text-3xl font-extrabold tracking-tight text-ink">
                Başvurun incelemede
              </h1>
              <p className="font-semibold text-ink-secondary">
                Ekibimiz belgelerini kontrol ediyor. Onaylandığında iş almaya başlayabilirsin —
                genellikle 1 iş günü sürer.
              </p>
              <ToneBadge tone="warning">İncelemede</ToneBadge>
            </>
          ) : profile?.status === "REJECTED" ? (
            <>
              <h1 className="text-3xl font-extrabold tracking-tight text-ink">
                Başvurun onaylanmadı
              </h1>
              {profile.rejectionReason ? (
                <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
                  Neden: {profile.rejectionReason}
                </p>
              ) : null}
              <p className="font-semibold text-ink-secondary">
                Eksikleri tamamlayıp yeniden başvurabilirsin.
              </p>
              <Button href="/courier/apply" size="lg" className="w-full">
                Yeniden başvur
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-extrabold tracking-tight text-ink">
                Teslimat yaparak kazan
              </h1>
              <p className="font-semibold text-ink-secondary">
                Kendi programınla çalış: iş teklifini gör, kabul et, teslim et. Kazancın
                komisyon düşülmüş net olarak cüzdanına işlenir.
              </p>
              <Button href="/courier/apply" size="lg" className="w-full">
                Kurye başvurusu yap
              </Button>
            </>
          )}
          <Link href="/sender" className="pt-1 text-center text-sm font-bold text-ink-secondary">
            Gönderici moduna dön
          </Link>
        </div>
      </main>
    );
  }

  let jobs: Awaited<ReturnType<typeof queryAvailableJobs>> = [];
  let wallet: Awaited<ReturnType<typeof queryCourierWallet>> | null = null;
  let loadError = false;
  try {
    [jobs, wallet] = await Promise.all([queryAvailableJobs(), queryCourierWallet()]);
  } catch (error) {
    console.error(
      "courier home query failed",
      error instanceof DomainError ? error.code : "unknown",
    );
    loadError = true;
  }

  return (
    <main className="mx-auto max-w-lg pb-32">
      <div className="flex items-start justify-between gap-3 px-6 pt-[max(3.5rem,env(safe-area-inset-top))]">
        <h1 className="text-[26px] font-extrabold tracking-[-0.025em] text-ink">Kurye paneli</h1>
        <CourierOnlineToggle />
      </div>
      <p className="px-6 pt-2 text-[11px] font-semibold text-ink-faint">
        Çevrimiçi olunca göndericiler haritada seni görebilir (isim/telefon yok).
      </p>

      <div className="px-6 pt-4">
        <div className="flex items-end justify-between rounded-[24px] bg-fill-soft p-5">
          <div>
            <p className="text-[13px] font-bold text-ink-secondary">Kazancın (teslim edilen)</p>
            <p className="tnum text-[40px] font-extrabold leading-none tracking-[-0.04em] text-ink">
              {wallet?.availableLabel ?? "—"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs font-bold text-ink-faint">
            <span className="flex items-center gap-1 text-warning-deep">
              <StarIcon size={13} /> Yeni kurye
            </span>
            <span className="flex items-center gap-1">
              <CheckIcon size={13} /> {wallet?.deliveredCount ?? 0} teslimat
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon size={13} /> komisyon {wallet?.commissionPctLabel ?? "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 pt-6">
        <div className="flex items-baseline justify-between pb-2">
          <h2 className="text-[13px] font-extrabold tracking-[0.06em] text-ink-faint">
            GÖNDERİM TALEPLERİ
          </h2>
          <Link href="/courier/jobs/mine" className="text-[13px] font-extrabold text-primary">
            Aktif işlerim →
          </Link>
        </div>
        {loadError ? (
          <ErrorState title="İşler yüklenemedi" />
        ) : (
          <JobOfferList jobs={jobs} />
        )}
      </div>
    </main>
  );
}
