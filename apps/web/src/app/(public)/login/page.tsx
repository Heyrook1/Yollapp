import { Suspense } from "react";
import { AuthForm } from "@/features/auth/components/AuthForm";
import { AppShell } from "@/components/ui/AppShell";

export default function LoginPage() {
  return (
    <AppShell>
      <Suspense fallback={<p className="text-ink-secondary">Yükleniyor…</p>}>
        <AuthForm mode="login" />
      </Suspense>
    </AppShell>
  );
}
