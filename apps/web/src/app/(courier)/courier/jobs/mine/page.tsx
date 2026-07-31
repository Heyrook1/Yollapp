import Link from "next/link";
import { DomainError } from "@yolla/core";
import { AppRole } from "@yolla/db";
import { getSession, hasRole } from "@/lib/auth";
import { MyJobsList } from "@/features/shipments/components/MyJobsList";
import { queryMyCourierJobs } from "@/features/shipments/queries";
import { messages } from "@/features/shipments/messages";

export const dynamic = "force-dynamic";

export default async function MyCourierJobsPage() {
  const session = await getSession();

  if (!session) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">{messages.myJobsTitle}</h1>
        <p className="text-brand-700">{messages.unauthorized}</p>
        <Link href="/login?next=/courier/jobs/mine" className="underline">
          Giriş yap
        </Link>
      </section>
    );
  }

  if (!hasRole(session.dbUser, AppRole.COURIER)) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">{messages.myJobsTitle}</h1>
        <p className="text-brand-700">{messages.courierRequired}</p>
      </section>
    );
  }

  let jobs: Awaited<ReturnType<typeof queryMyCourierJobs>> = [];
  let loadError: string | null = null;
  try {
    jobs = await queryMyCourierJobs();
  } catch (error) {
    console.error(
      "my courier jobs query failed",
      error instanceof DomainError ? error.code : "unknown",
    );
    loadError = messages.genericError;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-brand-900">{messages.myJobsTitle}</h1>
        <Link href="/courier/jobs" className="text-sm text-brand-700 underline">
          {messages.jobsTitle}
        </Link>
      </div>
      {loadError ? <p className="text-red-700">{loadError}</p> : <MyJobsList jobs={jobs} />}
    </section>
  );
}
