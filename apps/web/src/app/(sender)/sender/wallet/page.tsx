import { DomainError } from "@yolla/core";
import { getSession } from "@/lib/auth";
import { querySenderWallet } from "@/features/shipments/queries";
import { shipmentStatusMeta } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { CardIcon, WalletIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function SenderWalletPage() {
  const session = await getSession();
  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 pb-32">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Cüzdan</h1>
        <p className="font-semibold text-ink-secondary">Ödeme geçmişin için giriş yap.</p>
        <Button href="/login?next=/sender/wallet" size="lg" className="w-full">
          Giriş yap
        </Button>
      </main>
    );
  }

  let wallet: Awaited<ReturnType<typeof querySenderWallet>> | null = null;
  try {
    wallet = await querySenderWallet();
  } catch (error) {
    console.error(
      "sender wallet query failed",
      error instanceof DomainError ? error.code : "unknown",
    );
  }

  return (
    <main className="mx-auto max-w-lg pb-32">
      <div className="bg-[radial-gradient(140%_120%_at_100%_0%,#16305A_0%,#0B1220_60%)] px-6 pb-6 pt-[max(4rem,env(safe-area-inset-top))] text-ink-inverse">
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">Cüzdan</h1>
        <p className="pt-3 text-[13px] font-bold text-white/50">Toplam harcama</p>
        <p className="tnum text-[52px] font-extrabold leading-none tracking-[-0.05em]">
          {wallet?.totalLabel ?? "—"}
        </p>
        <p className="pt-2 text-sm font-semibold text-white/60">
          {wallet ? `${wallet.count} ödenmiş gönderi` : ""}
        </p>
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/15 px-4 py-3.5">
          <CardIcon size={20} className="text-white/70" />
          <span className="flex-1 text-sm font-bold text-white/70">
            Kayıtlı ödeme yöntemi yakında — şu an test ödemesi kullanılıyor.
          </span>
        </div>
      </div>

      <div className="px-6 pt-5">
        <h2 className="pb-2 text-[13px] font-extrabold tracking-[0.06em] text-ink-faint">
          ÖDEME GEÇMİŞİ
        </h2>
        {!wallet ? (
          <ErrorState title="Cüzdan yüklenemedi" />
        ) : wallet.entries.length === 0 ? (
          <EmptyState
            icon={<WalletIcon size={26} />}
            title="Henüz ödeme yok"
            description="İlk gönderini oluşturup ödediğinde burada görünür."
            action={<Button href="/sender/shipments/new">Paket gönder</Button>}
          />
        ) : (
          <ul>
            {wallet.entries.map((e) => (
              <li key={e.id} className="flex min-h-16 items-center gap-3.5 border-b border-line last:border-0">
                <div className="flex flex-1 flex-col py-2.5">
                  <span className="text-[15px] font-extrabold text-ink">{e.title}</span>
                  <span className="text-xs font-semibold text-ink-faint">
                    {e.detail} · {shipmentStatusMeta[e.status].label}
                  </span>
                </div>
                <span className="tnum text-base font-extrabold text-ink">−{e.amountLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
