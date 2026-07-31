"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptJobAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/Sheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { BriefcaseIcon } from "@/components/ui/icons";

export type JobOffer = {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  sizeName: string;
  zoneName: string;
  isExpress: boolean;
  windowLabel: string | null;
  amountLabel: string | null;
  netAmountLabel: string | null;
  commissionLabel: string | null;
};

export function JobOfferList({ jobs }: { jobs: JobOffer[] }) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirmJob = jobs.find((j) => j.id === confirmId) ?? null;

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<BriefcaseIcon size={26} />}
        title="Şu an açık iş yok"
        description="Yeni teslimatlar geldiğinde burada görünecek. Kısa aralıklarla kontrol et."
      />
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}

      <ul className="space-y-4">
        {jobs.map((job) => (
          <li key={job.id} className="rounded-[24px] bg-fill-soft p-5">
            <div className="flex items-baseline justify-between">
              <span className="tnum text-[28px] font-extrabold tracking-[-0.03em] text-ink">
                {job.netAmountLabel ?? job.amountLabel ?? "—"}
              </span>
              {job.commissionLabel ? (
                <span className="text-xs font-bold text-ink-faint">
                  brüt {job.amountLabel} − komisyon {job.commissionLabel}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5 pt-3 text-[13px] font-bold text-ink">
              <span className="flex items-center gap-2.5">
                <span className="size-2 shrink-0 rounded-full bg-navy" aria-hidden />
                <span className="truncate">{job.pickupAddress}</span>
              </span>
              <span className="flex items-center gap-2.5">
                <span className="size-2 shrink-0 rounded-[2px] bg-primary" aria-hidden />
                <span className="truncate">
                  {job.dropoffAddress} · <span className="text-ink-faint">{job.zoneName}</span>
                </span>
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-3">
              <Chip className="min-h-9 px-3 text-xs">{job.sizeName}</Chip>
              <Chip className="min-h-9 px-3 text-xs">
                {job.isExpress ? "Ekspres" : "Standart"}
              </Chip>
              {job.windowLabel ? (
                <Chip className="min-h-9 px-3 text-xs">{job.windowLabel}</Chip>
              ) : null}
              <Chip className="min-h-9 bg-success-soft px-3 text-xs text-success-deep">
                Nakitsiz
              </Chip>
            </div>

            <div className="pt-4">
              <Button
                variant="success"
                className="w-full"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setConfirmId(job.id);
                }}
              >
                Kabul et
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={confirmId !== null}
        title="İşi kabul et"
        description={
          confirmJob
            ? `${confirmJob.netAmountLabel ?? ""} net kazanç · ${confirmJob.pickupAddress} → ${confirmJob.dropoffAddress}`
            : ""
        }
        confirmLabel="Kabul et — göreve başla"
        tone="success"
        loading={pending}
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (!confirmId) return;
          startTransition(async () => {
            const result = await acceptJobAction({ shipmentId: confirmId });
            setConfirmId(null);
            if (result.ok) {
              router.push("/courier/jobs/mine");
              router.refresh();
            } else {
              setError(result.message);
            }
          });
        }}
      />
    </div>
  );
}
