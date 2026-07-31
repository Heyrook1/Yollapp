import Link from "next/link";

export const dynamic = "force-dynamic";

export default function SenderHomePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-brand-900">Gönderici paneli</h1>
      <p className="text-brand-700">Gönderi oluştur, fiyat teklifi al, durumunu takip et.</p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/sender/shipments/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
        >
          Yeni gönderi
        </Link>
        <Link
          href="/sender/shipments"
          className="rounded-md border border-brand-300 px-4 py-2 text-brand-800 hover:bg-brand-50"
        >
          Gönderilerim
        </Link>
      </div>
    </section>
  );
}
