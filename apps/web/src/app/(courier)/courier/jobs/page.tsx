import Link from "next/link";
import { DomainError } from "@yolla/core";
import { AppRole } from "@yolla/db";
import { getSession, hasRole } from "@/lib/auth";
import { AvailableJobsList } from "@/features/shipments/components/AvailableJobsList";
import { queryAvailableJobs } from "@/features/shipments/queries";
import { messages } from "@/features/shipments/messages";

export const dynamic = "force-dynamic";

export default async function CourierJobsPage() {
  const session = await getSession();

  if (!session) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">{messages.jobsTitle}</h1>
        <p className="text-ink-secondary">{messages.unauthorized}</p>
        <Link href="/login?next=/courier/jobs" className="underline">
          GiriÅŸ yap
        </Link>
      </section>
    );
  }

  if (!hasRole(session.dbUser, AppRole.COURIER)) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">{messages.jobsTitle}</h1>
        <p className="text-ink-secondary">{messages.courierRequired}</p>
        <Link href="/courier/apply" className="underline">
          Kurye baÅŸvurusu
        </Link>
      </section>
    );
  }

  let jobs: Awaited<ReturnType<typeof queryAvailableJobs>> = [];
  let loadError: string | null = null;
  try {
    jobs = await queryAvailableJobs();
  } catch (error) {
    console.error(
      "available jobs query failed",
      error instanceof DomainError ? error.code : "unknown",
    );
    loadError = messages.genericError;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">{messages.jobsTitle}</h1>
        <Link href="/courier/jobs/mine" className="text-sm text-ink-secondary underline">
          {messages.myJobsTitle}
        </Link>
      </div>
      {loadError ? <p className="text-red-700">{loadError}</p> : <AvailableJobsList jobs={jobs} />}
    </section>
  );
}
