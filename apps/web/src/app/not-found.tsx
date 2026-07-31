import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchIcon } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <EmptyState
        icon={<SearchIcon size={26} />}
        title="Sayfa bulunamadı"
        description="Aradığın sayfa taşınmış ya da hiç var olmamış olabilir."
        action={<Button href="/">Ana sayfaya dön</Button>}
      />
    </main>
  );
}
