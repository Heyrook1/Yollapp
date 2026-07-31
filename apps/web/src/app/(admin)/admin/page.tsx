import Link from "next/link";
import { DomainError } from "@yolla/core";
import { AppRole } from "@yolla/db";
import { getSession, hasRole } from "@/lib/auth";
import { queryAdminOverview } from "@/features/shipments/queries";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";
import { ShipmentStatusBadge } from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) {
    return (
      <div className="mx-auto max-w-sm space-y-4 py-16">
        <h1 className="text-2xl font-extrabold text-ink">Operasyon paneli</h1>
        <p className="font-semibold text-ink-secondary">Oturum gerekli.</p>
        <Button href="/login?next=/admin" className="w-full">
          Giriş yap
        </Button>
      </div>
    );
  }
  if (!hasRole(session.dbUser, AppRole.ADMIN)) {
    return (
      <ErrorState
        title="Erişim yok"
        description="Bu panel yalnızca operasyon yetkilileri içindir."
      />
    );
  }

  let data: Awaited<ReturnType<typeof queryAdminOverview>> | null = null;
  try {
    data = await queryAdminOverview();
  } catch (error) {
    console.error(
      "admin overview failed",
      error instanceof DomainError ? error.code : "unknown",
    );
  }

  if (!data) {
    return <ErrorState title="Panel yüklenemedi" />;
  }

  const metrics = [
    { label: "Aktif teslimat", value: data.active, tone: "text-ink" },
    { label: "Eşleşme kuyruğu", value: data.matchingQueue, tone: "text-info" },
    { label: "Yolda", value: data.inTransit, tone: "text-primary" },
    { label: "Ödeme bekleyen", value: data.awaitingPayment, tone: "text-warning-deep" },
    { label: "Teslim edildi", value: data.delivered, tone: "text-success-deep" },
    { label: "Sorunlu", value: data.failed, tone: "text-danger" },
    { label: "Başarı oranı", value: data.successRateLabel, tone: "text-ink" },
    { label: "Onay bekleyen kurye", value: data.pendingCouriers, tone: "text-warning-deep" },
    { label: "Onaylı kurye", value: data.approvedCouriers, tone: "text-ink" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Operasyon</h1>
          <p className="text-sm font-semibold text-ink-secondary">
            Canlı ağ durumu — gerçek zamanlı sayımlar
          </p>
        </div>
        {data.pendingCouriers > 0 ? (
          <Button href="/admin/couriers" size="sm">
            {data.pendingCouriers} kurye onayı bekliyor
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-[20px] bg-surface-elevated p-5">
            <p className="text-[13px] font-bold text-ink-secondary">{metric.label}</p>
            <p className={`tnum pt-1 text-[32px] font-extrabold tracking-[-0.03em] ${metric.tone}`}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-[20px] bg-surface-elevated p-5">
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-lg font-extrabold text-ink">Son hareketler</h2>
          <Link href="/admin/shipments" className="text-sm font-extrabold text-primary">
            Tüm gönderiler →
          </Link>
        </div>
        {data.recent.length === 0 ? (
          <p className="py-6 text-center text-sm font-semibold text-ink-secondary">
            Henüz gönderi yok.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-extrabold tracking-[0.06em] text-ink-faint">
                  <th className="py-2 pr-4">KOD</th>
                  <th className="py-2 pr-4">DURUM</th>
                  <th className="py-2 pr-4">BÖLGE</th>
                  <th className="py-2 pr-4">TUTAR</th>
                  <th className="py-2">GÜNCELLEME</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-4 font-extrabold text-ink">{s.code}</td>
                    <td className="py-3 pr-4">
                      <ShipmentStatusBadge status={s.status} />
                    </td>
                    <td className="py-3 pr-4 font-semibold text-ink-secondary">{s.zoneName}</td>
                    <td className="tnum py-3 pr-4 font-extrabold text-ink">{s.amountLabel}</td>
                    <td className="py-3 font-semibold text-ink-faint">{s.updatedLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
