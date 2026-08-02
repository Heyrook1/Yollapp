import { Suspense } from "react";
import { InteractiveMapPicker } from "@/features/maps/components/InteractiveMapPicker";
import { isBrowserMapsConfigured } from "@/lib/maps/load-google-maps";
import { ListSkeleton } from "@/components/ui/Skeleton";

export default function SenderMapPage() {
  const configured = isBrowserMapsConfigured();

  if (!configured) {
    return (
      <main className="mx-auto max-w-lg px-6 pb-32 pt-[max(3.5rem,env(safe-area-inset-top))]">
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-ink">Harita</h1>
        <p className="mt-2 text-sm font-semibold text-ink-secondary">
          Tarayıcı harita anahtarı yok. NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ekleyin.
        </p>
        <p className="mt-5 rounded-2xl bg-warning-soft px-4 py-3 text-sm font-bold text-warning-deep">
          `.env.local` anahtarını ekleyip `pnpm dev` yeniden başlat.
        </p>
      </main>
    );
  }

  // Full-bleed immersive map — padding/title yok (Uber / Bolt yüzey)
  return (
    <main className="relative -mx-0 min-h-[100dvh] max-w-none overflow-hidden bg-fill">
      <h1 className="sr-only">Harita — alım ve teslimat noktası seç</h1>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <InteractiveMapPicker />
      </Suspense>
    </main>
  );
}
