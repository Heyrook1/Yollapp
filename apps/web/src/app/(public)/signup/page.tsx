import { Suspense } from "react";
import { AuthForm } from "@/features/auth/components/AuthForm";

export default function SignupPage() {
  return (
    <Suspense fallback={<p>Yükleniyor…</p>}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
