import { DomainError } from "@yolla/core";
import { AppRole } from "@yolla/db";
import { getSession, hasRole } from "@/lib/auth";
import { PendingList } from "@/features/couriers/components/PendingList";
import { queryPendingCourierProfiles } from "@/features/couriers/queries";
import { messages } from "@/features/couriers/messages";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminCouriersPage() {
  const session = await getSession();

  if (!session) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">{messages.adminTitle}</h1>
        <p className="text-ink-secondary">{messages.unauthorized}</p>
        <Link href="/login?next=/admin/couriers" className="text-ink-secondary underline">
          GiriÅŸ yap
        </Link>
      </section>
    );
  }

  if (!hasRole(session.dbUser, AppRole.ADMIN)) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">{messages.adminTitle}</h1>
        <p className="text-ink-secondary">{messages.forbidden}</p>
      </section>
    );
  }

  let profiles: Awaited<ReturnType<typeof queryPendingCourierProfiles>> = [];
  let loadError: string | null = null;
  try {
    profiles = await queryPendingCourierProfiles();
  } catch (error) {
    console.error(
      "pending couriers query failed",
      error instanceof DomainError ? error.code : "unknown",
    );
    loadError = messages.genericError;
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">{messages.adminTitle}</h1>
      {loadError ? <p className="text-red-700">{loadError}</p> : <PendingList profiles={profiles} />}
    </section>
  );
}
