import Link from "next/link";
import { DomainError } from "@yolla/core";
import { AppRole } from "@yolla/db";
import { getSession, hasRole } from "@/lib/auth";
import { ActiveJobPanel } from "@/features/shipments/components/ActiveJobPanel";
import { queryMyCourierJobs } from "@/features/shipments/queries";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ShipmentStatusBadge } from "@/components/ui/StatusBadge";
import { BriefcaseIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const ACTIVE = ["MATCHED", "PICKED_UP", "IN_TRANSIT"] as const;

export default async function MyCourierJobsPage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 pb-32">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">İşlerim</h1>
        <Button href="/login?next=/courier/jobs/mine" size="lg" className="w-full">
          Giriş yap
        </Button>
      </main>
    );
  }

  if (!hasRole(session.dbUser, AppRole.COURIER)) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 pb-32">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">İşlerim</h1>
        <p className="font-semibold text-ink-secondary">Önce onaylı kurye olmalısın.</p>
        <Button href="/courier/apply" size="lg" className="w-full">
          Kurye başvurusu
        </Button>
      </main>
    );
  }

  let jobs: Awaited<ReturnType<typeof queryMyCourierJobs>> = [];
  let loadError = false;
  try {
    jobs = await queryMyCourierJobs();
  } catch (error) {
    console.error(
      "my courier jobs query failed",
      error instanceof DomainError ? error.code : "unknown",
    );
    loadError = true;
  }

  const active = jobs.filter((j) => (ACTIVE as readonly string[]).includes(j.status));
  const history = jobs.filter((j) => !(ACTIVE as readonly string[]).includes(j.status));

  return (
    <main className="mx-auto max-w-lg px-6 pb-32">
      <div className="flex items-end justify-between pt-[max(3.5rem,env(safe-area-inset-top))]">
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-ink">İşlerim</h1>
        <Link href="/courier/jobs" className="text-[13px] font-extrabold text-primary">
          Açık işler →
        </Link>
      </div>

      <div className="space-y-4 pt-5">
        {loadError ? <ErrorState title="İşler yüklenemedi" /> : null}

        {!loadError && active.length === 0 ? (
          <EmptyState
            icon={<BriefcaseIcon size={26} />}
            title="Aktif işin yok"
            description="Açık işlerden birini kabul ettiğinde görev akışı burada başlar."
            action={<Button href="/courier/jobs">Açık işlere bak</Button>}
          />
        ) : null}

        {active.map((job) => (
          <ActiveJobPanel key={job.id} job={job} />
        ))}

        {history.length > 0 ? (
          <div className="pt-2">
            <h2 className="pb-1 text-[13px] font-extrabold tracking-[0.06em] text-ink-faint">
              GEÇMİŞ
            </h2>
            <ul>
              {history.map((j) => (
                <li
                  key={j.id}
                  className="flex min-h-15 items-center gap-3 border-b border-line py-2.5 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-extrabold text-ink">
                      {j.id.slice(0, 8).toUpperCase()} · {j.zoneName}
                    </p>
                    <p className="truncate text-xs font-semibold text-ink-faint">
                      {j.dropoffAddress}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {j.netAmountLabel ? (
                      <span className="tnum text-sm font-extrabold text-success-deep">
                        +{j.netAmountLabel}
                      </span>
                    ) : null}
                    <ShipmentStatusBadge status={j.status} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </main>
  );
}
