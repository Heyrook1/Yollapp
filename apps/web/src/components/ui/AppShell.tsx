import type { ReactNode } from "react";

export function AppShell({
  children,
  title,
  dark = false,
  withTabPad = false,
}: {
  children: ReactNode;
  title?: string;
  dark?: boolean;
  withTabPad?: boolean;
}) {
  return (
    <div
      className={`min-h-screen ${dark ? "bg-surface-dark text-ink-inverse" : "bg-surface text-ink"}`}
    >
      {title ? (
        <header
          className={`sticky top-0 z-30 border-b px-4 py-3 backdrop-blur ${
            dark
              ? "border-white/10 bg-surface-dark/90"
              : "border-border bg-surface-elevated/90"
          }`}
        >
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            <span className="text-sm font-bold tracking-widest text-yolla-blue">YOLLA</span>
          </div>
        </header>
      ) : null}
      <div
        className={`mx-auto max-w-lg px-4 py-4 ${withTabPad ? "pb-28" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
