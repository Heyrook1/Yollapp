"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelShipmentAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Sheet";

export function CancelShipmentButton({
  shipmentId,
  label = "Vazgeç — ücret alınmaz",
}: {
  shipmentId: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2.5">
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        {label}
      </Button>
      {error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={open}
        title="Gönderi iptal edilsin mi?"
        description="Bu işlem geri alınamaz. Gönderi kurye havuzundan kaldırılır."
        confirmLabel="Evet, iptal et"
        cancelLabel="Vazgeç"
        tone="danger"
        loading={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setError(null);
          startTransition(async () => {
            const result = await cancelShipmentAction({ shipmentId });
            setOpen(false);
            if (result.ok) {
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
