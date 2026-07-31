"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";

export default function CourierError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("courier route error", error.digest ?? error.name);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-6 py-24">
      <ErrorState
        title="Bir şeyler ters gitti"
        description="Sayfa yüklenirken bir sorun oluştu. Lütfen tekrar dene."
        action={<Button onClick={reset}>Tekrar dene</Button>}
      />
    </div>
  );
}
