import { ListSkeleton } from "@/components/ui/Skeleton";

export default function SenderLoading() {
  return (
    <div className="mx-auto max-w-lg px-6 pb-32 pt-[max(3.5rem,env(safe-area-inset-top))]">
      <ListSkeleton rows={4} />
    </div>
  );
}
