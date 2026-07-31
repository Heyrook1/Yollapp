export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      className={`block animate-pulse rounded-2xl bg-fill ${className}`}
      aria-hidden
    />
  );
}

/** Liste ekranları için genel iskelet. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Yükleniyor">
      <Skeleton className="h-9 w-2/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
      <span className="sr-only">Yükleniyor…</span>
    </div>
  );
}
