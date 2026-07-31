import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default function SenderHomePage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold tracking-widest text-yolla-blue">YOLLA</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Nereye göndereceksin?</h1>
        <p className="text-ink-secondary">
          Bölge, boyut ve zaman penceresi seç — fiyatı anında gör.
        </p>
      </div>
      <Button href="/sender/shipments/new" className="w-full">
        Yeni gönderi
      </Button>
      <Button href="/sender/shipments" variant="secondary" className="w-full">
        Gönderilerim
      </Button>
    </section>
  );
}
