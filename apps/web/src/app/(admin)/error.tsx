"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("admin route error", error.digest ?? error.name);
  }, [error]);

  return (
    <ErrorState
      title="Panel yüklenemedi"
      description="Bir sorun oluştu. Lütfen tekrar dene."
      action={<Button onClick={reset}>Tekrar dene</Button>}
    />
  );
}
