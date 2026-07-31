import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yolla",
  description: "KKTC içi teslimat platformu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <header className="border-b border-brand-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-xl font-semibold tracking-tight text-brand-800">
              Yolla
            </Link>
            <nav className="flex gap-4 text-sm text-brand-700">
              <Link href="/login" className="hover:text-brand-900">
                Giriş
              </Link>
              <Link href="/signup" className="hover:text-brand-900">
                Kayıt
              </Link>
              <Link href="/courier/apply" className="hover:text-brand-900">
                Kurye ol
              </Link>
              <Link href="/admin/couriers" className="hover:text-brand-900">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
