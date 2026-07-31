import { Suspense } from "react";
import { AuthForm } from "@/features/auth/components/AuthForm";
import { TopBar } from "@/components/ui/TopBar";
import { ListSkeleton } from "@/components/ui/Skeleton";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-surface-elevated">
      <TopBar backHref="/" />
      <div className="mx-auto max-w-lg px-7 py-4">
        <Suspense fallback={<ListSkeleton rows={2} />}>
          <AuthForm mode="login" />
        </Suspense>
      </div>
    </main>
  );
}
