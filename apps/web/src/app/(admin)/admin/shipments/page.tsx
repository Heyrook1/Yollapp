import Link from "next/link";
import { DomainError } from "@yolla/core";
import { AppRole } from "@yolla/db";
import { getSession, hasRole } from "@/lib/auth";
import {
  parseAdminStatusFilter,
  queryAdminShipments,
} from "@/features/shipments/queries";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ShipmentStatusBadge, shipmentStatusMeta } from "@/components/ui/StatusBadge";
import { PackageIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const filters = [
  { value: null, label: "Tümü" },
  { value: "PAID", label: "Eşleşme bekliyor" },
  { value: "IN_TRANSIT", label: "Yolda" },
  { value: "DELIVERED", label: "Teslim" },
  { value: "FAILED_DELIVERY", label: "Sorunlu" },
  { value: "CANCELLED", label: "İptal" },
] as const;

export default async function AdminShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    return (
      <div className="mx-auto max-w-sm space-y-4 py-16">
        <h1 className="text-2xl font-extrabold text-ink">Gönderiler</h1>
        <Button href="/login?next=/admin/shipments" className="w-full">
          Giriş yap
        </Button>
      </div>
    );
  }
  if (!hasRole(session.dbUser, AppRole.ADMIN)) {
    return <ErrorState title="Erişim yok" description="Bu sayfa yalnızca operasyon içindir." />;
  }

  const { status: rawStatus } = await searchParams;
  const status = parseAdminStatusFilter(rawStatus);

  let shipments: Awaited<ReturnType<typeof queryAdminShipments>> = [];
  let loadError = false;
  try {
    shipments = await queryAdminShipments(status);
  } catch (error) {
    console.error(
      "admin shipments failed",
      error instanceof DomainError ? error.code : "unknown",
    );
    loadError = true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Gönderiler</h1>
        <p className="text-sm font-semibold text-ink-secondary">Son 50 kayıt</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Durum filtresi">
        {filters.map((f) => {
          const active = status === f.value || (!status && f.value === null);
          return (
            <Link
              key={f.label}
              href={f.value ? `/admin/shipments?status=${f.value}` : "/admin/shipments"}
              aria-current={active ? "true" : undefined}
              className={`inline-flex min-h-10 items-center rounded-full px-4 text-[13px] font-extrabold transition ${
                active
                  ? "bg-navy text-ink-inverse"
                  : "bg-surface-elevated text-ink-secondary hover:bg-fill"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {loadError ? (
        <ErrorState title="Gönderiler yüklenemedi" />
      ) : shipments.length === 0 ? (
        <EmptyState
          icon={<PackageIcon size={26} />}
          title="Kayıt bulunamadı"
          description={
            status
              ? `"${shipmentStatusMeta[status].label}" durumunda gönderi yok.`
              : "Henüz gönderi oluşturulmadı."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[20px] bg-surface-elevated p-5">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold tracking-[0.06em] text-ink-faint">
                <th className="py-2 pr-4">KOD</th>
                <th className="py-2 pr-4">DURUM</th>
                <th className="py-2 pr-4">ALICI</th>
                <th className="py-2 pr-4">BÖLGE · BOYUT</th>
                <th className="py-2 pr-4">TUTAR</th>
                <th className="py-2">GÜNCELLEME</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="py-3 pr-4 font-extrabold text-ink">{s.code}</td>
                  <td className="py-3 pr-4">
                    <ShipmentStatusBadge status={s.status} />
                  </td>
                  <td className="py-3 pr-4 font-semibold text-ink">{s.recipientName}</td>
                  <td className="py-3 pr-4 font-semibold text-ink-secondary">
                    {s.zoneName} · {s.sizeName}
                    {s.isExpress ? " · Ekspres" : ""}
                  </td>
                  <td className="tnum py-3 pr-4 font-extrabold text-ink">{s.amountLabel}</td>
                  <td className="py-3 font-semibold text-ink-faint">{s.updatedLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
