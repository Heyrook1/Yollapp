import type { ShipmentStatus } from "@yolla/core";

type Tone = "neutral" | "info" | "primary" | "success" | "warning" | "danger";

const toneClass: Record<Tone, string> = {
  neutral: "bg-fill text-ink-secondary",
  info: "bg-info-soft text-info",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success-deep",
  warning: "bg-warning-soft text-warning-deep",
  danger: "bg-danger-soft text-danger",
};

export const shipmentStatusMeta: Record<ShipmentStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Taslak", tone: "neutral" },
  QUOTED: { label: "Ödeme bekliyor", tone: "warning" },
  PAID: { label: "Kurye aranıyor", tone: "info" },
  MATCHED: { label: "Kurye atandı", tone: "primary" },
  PICKED_UP: { label: "Paket alındı", tone: "primary" },
  IN_TRANSIT: { label: "Yolda", tone: "primary" },
  DELIVERED: { label: "Teslim edildi", tone: "success" },
  FAILED_DELIVERY: { label: "Teslim edilemedi", tone: "danger" },
  RETURNED: { label: "İade edildi", tone: "warning" },
  CANCELLED: { label: "İptal edildi", tone: "neutral" },
};

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const meta = shipmentStatusMeta[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${toneClass[meta.tone]}`}
    >
      {meta.label}
    </span>
  );
}

export function ToneBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}
