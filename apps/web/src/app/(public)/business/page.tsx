import Link from "next/link";
import { DomainError } from "@yolla/core";
import { getSession } from "@/lib/auth";
import { queryMyShipments, querySenderWallet } from "@/features/shipments/queries";
import { Button } from "@/components/ui/Button";
import { TopBar } from "@/components/ui/TopBar";
import { ToneBadge } from "@/components/ui/StatusBadge";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  ChartIcon,
  DocumentIcon,
  UsersIcon,
} from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function BusinessPage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6">
        <span className="flex size-16 items-center justify-center rounded-[20px] bg-primary-soft text-primary">
          <BriefcaseIcon size={30} />
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          İşletmen için Yolla
        </h1>
        <p className="font-semibold text-ink-secondary">
          Instagram ve yerel satıcılar için uygun fiyatlı teslimat: tekrarlayan gönderiler,
          kayıtlı alıcılar ve raporlar tek panelde.
        </p>
        <Button href="/signup?next=/business" size="lg" className="w-full">
          Hesap oluştur
        </Button>
        <Link href="/login?next=/business" className="text-center text-sm font-bold text-ink-secondary">
          Zaten hesabım var — giriş yap
        </Link>
      </main>
    );
  }

  let shipments: Awaited<ReturnType<typeof queryMyShipments>> = [];
  let wallet: Awaited<ReturnType<typeof querySenderWallet>> | null = null;
  try {
    [shipments, wallet] = await Promise.all([queryMyShipments(), querySenderWallet()]);
  } catch (error) {
    console.error(
      "business page query failed",
      error instanceof DomainError ? error.code : "unknown",
    );
  }

  const delivered = shipments.filter((s) => s.status === "DELIVERED").length;

  return (
    <main className="mx-auto min-h-screen max-w-lg pb-16">
      <TopBar backHref="/sender" title="İşletme" />
      <div className="space-y-6 px-6 pt-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink-secondary">
            Gönderi verilerin işletme görünümünde
          </p>
          <ToneBadge tone="info">Erken erişim</ToneBadge>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[20px] bg-fill-soft p-4">
            <p className="text-xs font-bold text-ink-secondary">Gönderi</p>
            <p className="tnum text-[28px] font-extrabold tracking-[-0.03em] text-ink">
              {shipments.length}
            </p>
          </div>
          <div className="rounded-[20px] bg-fill-soft p-4">
            <p className="text-xs font-bold text-ink-secondary">Teslim</p>
            <p className="tnum text-[28px] font-extrabold tracking-[-0.03em] text-success-deep">
              {delivered}
            </p>
          </div>
          <div className="rounded-[20px] bg-fill-soft p-4">
            <p className="text-xs font-bold text-ink-secondary">Harcama</p>
            <p className="tnum text-[20px] font-extrabold tracking-[-0.02em] text-ink">
              {wallet?.totalLabel ?? "—"}
            </p>
          </div>
        </div>

        <Button href="/sender/shipments/new" size="lg" className="w-full">
          Yeni gönderi oluştur <ArrowRightIcon size={18} />
        </Button>

        <div>
          <h2 className="pb-1 text-[13px] font-extrabold tracking-[0.06em] text-ink-faint">
            YAKINDA
          </h2>
          <ul>
            {[
              {
                icon: <DocumentIcon size={20} />,
                title: "Toplu gönderi ve CSV içe aktarma",
                detail: "Yüzlerce gönderiyi tek seferde oluştur",
              },
              {
                icon: <UsersIcon size={20} />,
                title: "Kayıtlı alıcılar ve ekip üyeleri",
                detail: "Tekrarlayan teslimatları saniyeler içinde gönder",
              },
              {
                icon: <ChartIcon size={20} />,
                title: "Raporlar ve faturalar",
                detail: "Aylık maliyet görünümü ve indirilebilir dökümler",
              },
            ].map((f) => (
              <li
                key={f.title}
                className="flex min-h-16 items-center gap-3.5 border-b border-line py-2 last:border-0"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[16px] bg-fill text-ink-faint">
                  {f.icon}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-extrabold text-ink">{f.title}</span>
                  <span className="truncate text-xs font-semibold text-ink-faint">{f.detail}</span>
                </span>
                <ToneBadge tone="neutral">Yakında</ToneBadge>
              </li>
            ))}
          </ul>
        </div>

        <p className="rounded-2xl bg-primary-soft px-4 py-3 text-sm font-semibold text-ink-secondary">
          İşletme doğrulaması ve özel fiyatlandırma çok yakında. İlgileniyorsan gönderilerini
          şimdiden bu hesapla oluşturmaya başlayabilirsin — geçmişin otomatik taşınır.
        </p>
      </div>
    </main>
  );
}
