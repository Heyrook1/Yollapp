import { DomainError } from "@yolla/core";
import { AppRole } from "@yolla/db";
import { getSession, hasRole } from "@/lib/auth";
import { queryCourierWallet } from "@/features/shipments/queries";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ArrowUpIcon, ClockIcon, WalletIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function CourierWalletPage() {
  const session = await getSession();
  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 pb-32">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Cüzdan</h1>
        <Button href="/login?next=/courier/wallet" size="lg" className="w-full">
          Giriş yap
        </Button>
      </main>
    );
  }

  if (!hasRole(session.dbUser, AppRole.COURIER)) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 pb-32">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Cüzdan</h1>
        <p className="font-semibold text-ink-secondary">
          Kurye cüzdanı, onaylı kurye hesapları için açılır.
        </p>
        <Button href="/courier/apply" size="lg" className="w-full">
          Kurye başvurusu
        </Button>
      </main>
    );
  }

  let wallet: Awaited<ReturnType<typeof queryCourierWallet>> | null = null;
  try {
    wallet = await queryCourierWallet();
  } catch (error) {
    console.error(
      "courier wallet query failed",
      error instanceof DomainError ? error.code : "unknown",
    );
  }

  return (
    <main className="mx-auto max-w-lg pb-32">
      <div className="bg-[radial-gradient(140%_120%_at_100%_0%,#16305A_0%,#0B1220_60%)] px-6 pb-6 pt-[max(4rem,env(safe-area-inset-top))] text-ink-inverse">
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">Cüzdan</h1>
        <p className="pt-4 text-[13px] font-bold text-white/50">Kullanılabilir bakiye</p>
        <p className="tnum text-[52px] font-extrabold leading-none tracking-[-0.05em]">
          {wallet?.availableLabel ?? "—"}
        </p>
        <div className="flex gap-2.5 pt-4">
          <Button
            variant="secondary"
            className="flex-1 border-0 bg-white/15 text-white/60"
            disabled
            aria-label="Para çekme yakında"
          >
            Para çek — yakında
          </Button>
        </div>
        <p className="pt-2 text-xs font-semibold text-white/45">
          Payout altyapısı bağlandığında bakiyeni istediğin an çekebileceksin.
        </p>
        <div className="flex border-t border-white/10 pt-4">
          <div className="flex-1">
            <p className="text-[11px] font-extrabold tracking-[0.05em] text-white/45">BEKLEYEN</p>
            <p className="tnum text-[19px] font-extrabold">{wallet?.pendingLabel ?? "—"}</p>
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-extrabold tracking-[0.05em] text-white/45">TESLİMAT</p>
            <p className="tnum text-[19px] font-extrabold">{wallet?.deliveredCount ?? 0}</p>
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-extrabold tracking-[0.05em] text-white/45">KOMİSYON</p>
            <p className="tnum text-[19px] font-extrabold">{wallet?.commissionPctLabel ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="px-6 pt-5">
        <h2 className="pb-2 text-[13px] font-extrabold tracking-[0.06em] text-ink-faint">
          İŞLEM GEÇMİŞİ
        </h2>
        {!wallet ? (
          <ErrorState title="Cüzdan yüklenemedi" />
        ) : wallet.entries.length === 0 ? (
          <EmptyState
            icon={<WalletIcon size={26} />}
            title="Henüz işlem yok"
            description="İlk teslimatını tamamladığında net kazancın burada görünür."
            action={<Button href="/courier/jobs">Açık işlere bak</Button>}
          />
        ) : (
          <ul>
            {wallet.entries.map((e) => (
              <li
                key={e.id}
                className="flex min-h-16 items-center gap-3.5 border-b border-line last:border-0"
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                    e.settled ? "bg-success-soft text-success-deep" : "bg-warning-soft text-warning-deep"
                  }`}
                >
                  {e.settled ? <ArrowUpIcon size={18} /> : <ClockIcon size={18} />}
                </span>
                <div className="min-w-0 flex-1 py-2.5">
                  <p className="truncate text-[15px] font-extrabold text-ink">{e.title}</p>
                  <p className="truncate text-xs font-semibold text-ink-faint">
                    {e.detail}
                    {e.settled ? "" : " · devam ediyor"}
                  </p>
                </div>
                <span
                  className={`tnum text-base font-extrabold ${
                    e.settled ? "text-success-deep" : "text-ink-faint"
                  }`}
                >
                  +{e.amountLabel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
