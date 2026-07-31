import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  title?: string;
  dark?: boolean;
  withTabPad?: boolean;
  /** Tam genişlik ekranlar (harita vb.) için yatay padding'i kaldırır. */
  flush?: boolean;
};

export function AppShell({
  children,
  title,
  dark = false,
  withTabPad = false,
  flush = false,
}: Props) {
  return (
    <div
      className={`min-h-screen ${dark ? "bg-surface-dark text-ink-inverse" : "bg-surface text-ink"}`}
    >
      {title ? (
        <header
          className={`sticky top-0 z-30 border-b px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur ${
            dark
              ? "border-white/10 bg-surface-dark/90"
              : "border-line bg-surface/90"
          }`}
        >
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <h1 className="text-lg font-extrabold tracking-tight">{title}</h1>
            <span className="text-sm font-extrabold tracking-widest text-primary">YOLLA</span>
          </div>
        </header>
      ) : null}
      <div
        className={`mx-auto max-w-lg ${flush ? "" : "px-5 py-4"} ${withTabPad ? "pb-32" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
