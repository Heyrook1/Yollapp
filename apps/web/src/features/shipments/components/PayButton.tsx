"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPaidAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { LockIcon } from "@/components/ui/icons";

/**
 * Mock ödeme — gerçek ödeme sağlayıcı entegrasyonu MVP sonrası.
 * Kullanıcıya da bu açıkça söylenir; sahte kart akışı gösterilmez.
 */
export function PayButton({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2.5">
      <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-success-deep">
        <LockIcon size={13} /> Test ödemesi — gerçek kart çekilmez
      </p>
      <Button
        size="lg"
        className="w-full"
        loading={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await markPaidAction({ shipmentId });
            if (result.ok) {
              router.refresh();
            } else {
              setError(result.message);
            }
          });
        }}
      >
        Ödemeyi tamamla
      </Button>
      {error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
