import type { ReactNode } from "react";

export type TimelineItem = {
  key: string;
  title: string;
  detail?: string;
  time?: string;
  state: "done" | "active" | "todo" | "failed";
  icon?: ReactNode;
};

const dotClass: Record<TimelineItem["state"], string> = {
  done: "bg-success text-ink-inverse",
  active: "bg-primary text-ink-inverse motion-safe:animate-blink",
  todo: "border-2 border-border bg-surface-elevated",
  failed: "bg-danger text-ink-inverse",
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="space-y-0">
      {items.map((item, i) => (
        <li key={item.key} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${dotClass[item.state]}`}
              aria-hidden
            >
              {item.state === "done" ? "✓" : item.state === "failed" ? "!" : null}
            </span>
            {i < items.length - 1 ? <span className="w-0.5 flex-1 bg-line" aria-hidden /> : null}
          </div>
          <div className={`flex-1 pb-6 ${item.state === "todo" ? "opacity-50" : ""}`}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[15px] font-extrabold text-ink">{item.title}</p>
              {item.time ? (
                <span className="tnum text-xs font-bold text-ink-faint">{item.time}</span>
              ) : null}
            </div>
            {item.detail ? (
              <p className="text-[13px] font-semibold text-ink-secondary">{item.detail}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
