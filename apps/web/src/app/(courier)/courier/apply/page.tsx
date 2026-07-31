import { DomainError } from "@yolla/core";
import { getSession } from "@/lib/auth";
import { ApplyForm } from "@/features/couriers/components/ApplyForm";
import { StatusBadge } from "@/features/couriers/components/StatusBadge";
import { queryMyCourierProfile } from "@/features/couriers/queries";
import { messages } from "@/features/couriers/messages";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CourierApplyPage() {
  const session = await getSession();

  if (!session) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">{messages.applyTitle}</h1>
        <p className="text-brand-700">{messages.unauthorized}</p>
        <Link href="/login?next=/courier/apply" className="text-brand-700 underline">
          Giriş yap
        </Link>
      </section>
    );
  }

  let profile = null;
  let loadError: string | null = null;
  try {
    profile = await queryMyCourierProfile(session);
  } catch (error) {
    console.error(
      "courier profile query failed",
      error instanceof DomainError ? error.code : "unknown",
    );
    loadError = messages.genericError;
  }

  const canApply =
    !profile || profile.status === "REJECTED";

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-900">{messages.applyTitle}</h1>
        <p className="text-brand-700">{messages.applySubtitle}</p>
      </div>

      {loadError ? <p className="text-red-700">{loadError}</p> : null}

      {!loadError && !profile ? (
        <p className="text-brand-700">{messages.noProfile}</p>
      ) : null}

      {profile ? (
        <div className="space-y-2">
          <h2 className="text-lg font-medium">{messages.statusTitle}</h2>
          <StatusBadge profile={profile} />
        </div>
      ) : null}

      {canApply ? <ApplyForm /> : null}
    </section>
  );
}
