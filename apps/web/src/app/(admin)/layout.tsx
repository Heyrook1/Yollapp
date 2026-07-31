import { AppShell } from "@/components/ui/AppShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell title="Operasyon">{children}</AppShell>;
}
