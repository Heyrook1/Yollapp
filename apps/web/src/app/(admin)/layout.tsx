import { AdminSidebar } from "@/components/ui/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-6 py-8 max-lg:px-4">{children}</div>
      </div>
    </div>
  );
}
