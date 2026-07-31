import { MapCanvas } from "@/components/ui/MapCanvas";
import { Button } from "@/components/ui/Button";

export default function SenderMapPage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-lg flex-col">
      <MapCanvas variant="idle" className="absolute inset-0" />
      <div className="relative mt-auto">
        <div className="rounded-t-[32px] bg-surface-elevated px-6 pb-[max(7rem,env(safe-area-inset-bottom))] pt-3 shadow-sheet">
          <span className="mx-auto mb-4 block h-1.5 w-11 rounded-full bg-border" aria-hidden />
          <div className="space-y-3">
            <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-ink">Harita</h1>
            <p className="text-sm font-semibold text-ink-secondary">
              Canlı harita, harita sağlayıcısı bağlandığında burada olacak. Şimdilik
              gönderilerini liste üzerinden takip edebilirsin.
            </p>
            <Button href="/sender/shipments" variant="dark" className="w-full">
              Gönderilerime git
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
