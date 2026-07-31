type Props = {
  total: number;
  /** Tamamlanan segment sayısı (yeşil). */
  done: number;
  /** Aktif segmenti (mavi, yanıp söner) göster. */
  showActive?: boolean;
  label?: string;
  className?: string;
};

/** v4 segmentli ilerleme: yeşil = tamamlandı, mavi = aktif, gri = kalan. */
export function SegmentedProgress({ total, done, showActive = true, label, className = "" }: Props) {
  const segments = Array.from({ length: total }, (_, i) => {
    if (i < done) return "done" as const;
    if (i === done && showActive) return "active" as const;
    return "todo" as const;
  });
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label={label}
      className={`flex gap-1.5 ${className}`}
    >
      {segments.map((s, i) => (
        <span
          key={i}
          className={`h-1.5 flex-1 rounded-full ${
            s === "done"
              ? "bg-success"
              : s === "active"
                ? "bg-primary motion-safe:animate-blink"
                : "bg-line"
          }`}
        />
      ))}
    </div>
  );
}
