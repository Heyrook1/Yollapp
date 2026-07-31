"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ShipmentStatus } from "@yolla/core";
import { courierProgressAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Sheet";
import { SegmentedProgress } from "@/components/ui/SegmentedProgress";
import { ShipmentStatusBadge } from "@/components/ui/StatusBadge";
import { AlertIcon, PhoneIcon } from "@/components/ui/icons";

export type CourierJob = {
  id: string;
  status: ShipmentStatus;
  pickupAddress: string;
  dropoffAddress: string;
  recipientName: string;
  recipientPhone: string;
  notes: string | null;
  sizeName: string;
  zoneName: string;
  windowLabel: string | null;
  netAmountLabel: string | null;
};

type StepConfig = {
  step: number;
  title: string;
  detail: string;
  actionLabel: string;
  event: "PICK_UP" | "START_TRANSIT" | "DELIVER";
  confirmTitle: string;
  confirmDescription: string;
};

const steps: Partial<Record<ShipmentStatus, StepConfig>> = {
  MATCHED: {
    step: 1,
    title: "Alım noktasına git",
    detail: "Paketi göndericiden teslim al.",
    actionLabel: "Paketi teslim aldım",
    event: "PICK_UP",
    confirmTitle: "Paketi teslim aldın mı?",
    confirmDescription: "Bu adım gönderiye 'Paket alındı' olarak işlenir.",
  },
  PICKED_UP: {
    step: 2,
    title: "Yola çık",
    detail: "Teslimat noktasına doğru hareket et.",
    actionLabel: "Yola çıktım",
    event: "START_TRANSIT",
    confirmTitle: "Yola çıkıyor musun?",
    confirmDescription: "Gönderici ve alıcı 'Yolda' durumunu görecek.",
  },
  IN_TRANSIT: {
    step: 3,
    title: "Teslimat noktasına git",
    detail: "Paketi alıcıya teslim et.",
    actionLabel: "Teslim ettim",
    event: "DELIVER",
    confirmTitle: "Teslimat tamamlandı mı?",
    confirmDescription: "Bu işlem geri alınamaz. Kazancın cüzdanına işlenir.",
  },
};

export function ActiveJobPanel({ job }: { job: CourierJob }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<"progress" | "fail" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const config = steps[job.status];
  if (!config) return null;

  function run(event: "PICK_UP" | "START_TRANSIT" | "DELIVER" | "FAIL_DELIVERY") {
    setError(null);
    startTransition(async () => {
      const result = await courierProgressAction({ shipmentId: job.id, event });
      setConfirming(null);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <section className="rounded-[24px] bg-surface-elevated p-5 shadow-float">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.06em] text-ink-faint">
            GÖREV {config.step}/4 · {job.id.slice(0, 8).toUpperCase()}
          </p>
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-ink">{config.title}</h2>
        </div>
        <button
          type="button"
          aria-label="Teslimat sorunu bildir"
          onClick={() => setConfirming("fail")}
          disabled={pending || job.status === "MATCHED"}
          className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger disabled:opacity-40"
        >
          <AlertIcon size={20} />
        </button>
      </div>

      <div className="pt-3.5">
        <SegmentedProgress total={4} done={config.step} label="Görev ilerlemesi" />
      </div>

      <p className="pt-3 text-sm font-semibold text-ink-secondary">{config.detail}</p>

      <div className="mt-3.5 flex items-center gap-3.5 rounded-[18px] bg-fill-soft p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-extrabold text-ink-inverse">
          {job.recipientName.slice(0, 2).toLocaleUpperCase("tr-TR")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold text-ink">
            {job.recipientName} · alıcı
          </p>
          <p className="truncate text-xs font-bold text-ink-faint">
            {job.status === "MATCHED" ? job.pickupAddress : job.dropoffAddress}
          </p>
        </div>
        <a
          href={`tel:${job.recipientPhone}`}
          aria-label="Alıcıyı ara"
          className="flex size-12 items-center justify-center rounded-full bg-navy text-ink-inverse"
        >
          <PhoneIcon size={18} />
        </a>
      </div>

      {job.notes ? (
        <p className="mt-3 rounded-2xl bg-warning-soft px-4 py-3 text-sm font-bold text-warning-deep">
          Not: {job.notes}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}

      <div className="pt-4">
        <Button
          variant={config.event === "DELIVER" ? "success" : "dark"}
          size="lg"
          className="w-full"
          loading={pending}
          onClick={() => setConfirming("progress")}
        >
          {config.actionLabel}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming === "progress"}
        title={config.confirmTitle}
        description={config.confirmDescription}
        confirmLabel={config.actionLabel}
        tone={config.event === "DELIVER" ? "success" : "primary"}
        loading={pending}
        onCancel={() => setConfirming(null)}
        onConfirm={() => run(config.event)}
      />
      <ConfirmDialog
        open={confirming === "fail"}
        title="Teslimat sorunu bildir"
        description="Teslimat tamamlanamadıysa gönderi 'Teslim edilemedi' durumuna alınır ve operasyon ekibi bilgilendirilir."
        confirmLabel="Sorun bildir"
        tone="danger"
        loading={pending}
        onCancel={() => setConfirming(null)}
        onConfirm={() => run("FAIL_DELIVERY")}
      />
    </section>
  );
}
