import { AppRole } from "@yolla/db";
import { getSession, hasRole } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";
import { AdminCourierMap } from "@/features/maps/components/AdminCourierMap";
import { isBrowserMapsConfigured } from "@/lib/maps/load-google-maps";

export const dynamic = "force-dynamic";

export default async function AdminMapPage() {
  const session = await getSession();
  if (!session) {
    return (
      <div className="mx-auto max-w-sm space-y-4 py-16">
        <h1 className="text-2xl font-extrabold text-ink">Canlı harita</h1>
        <Button href="/login?next=/admin/map" className="w-full">
          Giriş yap
        </Button>
      </div>
    );
  }
  if (!hasRole(session.dbUser, AppRole.ADMIN)) {
    return (
      <ErrorState
        title="Erişim yok"
        description="Bu panel yalnızca operasyon yetkilileri içindir."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Canlı kurye haritası
        </h1>
        <p className="mt-1 text-sm font-semibold text-ink-secondary">
          Opt-in paylaşım yapan kuryeler — müsait, teslimatta, meşgul.
        </p>
      </div>
      {isBrowserMapsConfigured() ? (
        <AdminCourierMap />
      ) : (
        <p className="rounded-2xl bg-warning-soft px-4 py-3 text-sm font-bold text-warning-deep">
          NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY gerekli.
        </p>
      )}
    </div>
  );
}
