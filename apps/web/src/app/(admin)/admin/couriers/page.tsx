import { DomainError } from "@yolla/core";
import { AppRole } from "@yolla/db";
import { getSession, hasRole } from "@/lib/auth";
import { PendingList } from "@/features/couriers/components/PendingList";
import { queryPendingCourierProfiles } from "@/features/couriers/queries";
import { messages } from "@/features/couriers/messages";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function AdminCouriersPage() {
  const session = await getSession();
  if (!session) {
    return (
      <div className="mx-auto max-w-sm space-y-4 py-16">
        <h1 className="text-2xl font-extrabold text-ink">{messages.adminTitle}</h1>
        <Button href="/login?next=/admin/couriers" className="w-full">
          Giriş yap
        </Button>
      </div>
    );
  }
  if (!hasRole(session.dbUser, AppRole.ADMIN)) {
    return <ErrorState title="Erişim yok" description={messages.forbidden} />;
  }

  let profiles: Awaited<ReturnType<typeof queryPendingCourierProfiles>> = [];
  let loadError = false;
  try {
    profiles = await queryPendingCourierProfiles();
  } catch (error) {
    console.error(
      "pending couriers query failed",
      error instanceof DomainError ? error.code : "unknown",
    );
    loadError = true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          {messages.adminTitle}
        </h1>
        <p className="text-sm font-semibold text-ink-secondary">
          Onay bekleyen başvurular — karar geri alınamaz, dikkatle incele.
        </p>
      </div>
      <div className="rounded-[20px] bg-surface-elevated p-5">
        {loadError ? <ErrorState title="Başvurular yüklenemedi" /> : <PendingList profiles={profiles} />}
      </div>
    </div>
  );
}
