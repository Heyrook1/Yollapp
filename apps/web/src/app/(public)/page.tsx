import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-semibold tracking-tight text-brand-900">Yolla</h1>
      <p className="max-w-xl text-lg text-brand-700">
        KKTC içi gig-economy teslimat. Gönderi oluştur, kurye ol, takip et.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
        >
          Başla
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-brand-300 px-4 py-2 text-brand-800 hover:bg-brand-50"
        >
          Giriş yap
        </Link>
      </div>
    </section>
  );
}
