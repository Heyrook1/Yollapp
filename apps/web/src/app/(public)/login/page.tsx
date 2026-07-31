import { Suspense } from "react";
import { AuthForm } from "@/features/auth/components/AuthForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<p>Yükleniyor…</p>}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
