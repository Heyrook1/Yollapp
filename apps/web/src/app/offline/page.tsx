import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { MapPinIcon } from "@/components/ui/icons";

export const metadata = { title: "Çevrimdışı · YOLLA" };

/** Service worker'ın çevrimdışıyken gösterdiği kabuk sayfa. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <EmptyState
        icon={<MapPinIcon size={26} />}
        title="İnternet bağlantısı yok"
        description="Bağlantın geri geldiğinde kaldığın yerden devam edebilirsin. Gönderi durumları güncel olmayabilir."
        action={<Button href="/sender">Tekrar dene</Button>}
      />
    </main>
  );
}
