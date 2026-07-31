import type { ReactNode } from "react";
import { PackageIcon, TruckIcon } from "./icons";

/**
 * Harita adaptörü placeholder'ı.
 *
 * Gerçek harita sağlayıcısı (CLAUDE.md §2: ayrı adaptör katmanı) bağlanana kadar
 * stilize bir şehir dokusu çizer. Canlı konum/rota TAKLİT ETMEZ — yalnızca
 * alım/teslim uçlarını ve durumu temsil eder. Sağlayıcı geldiğinde bu bileşen
 * aynı props ile gerçek harita render eden implementasyonla değiştirilir.
 */

type Variant = "idle" | "route" | "radar" | "progress";

type Props = {
  variant?: Variant;
  pickupLabel?: string;
  dropoffLabel?: string;
  /** route/progress: rotanın kat edilen kısmı (0–1). */
  progress?: number;
  className?: string;
  children?: ReactNode;
};

function CityTexture() {
  return (
    <>
      <div className="absolute inset-0 bg-[#E9EDF2]" aria-hidden />
      <div
        className="absolute -top-16 -right-20 h-72 w-[340px] rounded-bl-[180px] bg-[#CBE3F5]"
        aria-hidden
      />
      <div
        className="absolute top-[38%] left-8 h-24 w-28 rounded-2xl bg-[#DCEBDD]"
        aria-hidden
      />
      <div
        className="absolute top-24 -left-10 h-5 w-[140%] rotate-[9deg] bg-white shadow-[0_1px_0_rgba(11,18,32,0.05)]"
        aria-hidden
      />
      <div
        className="absolute top-[55%] -left-10 h-6 w-[140%] -rotate-[7deg] border-y-2 border-[#F4D9A6] bg-[#FFE9C7]"
        aria-hidden
      />
      <div
        className="absolute -top-10 left-[58%] h-[130%] w-4 rotate-[13deg] bg-white"
        aria-hidden
      />
      <div className="absolute top-[30%] left-[15%] h-13 w-19 rounded-lg bg-[#DDE3EC]" aria-hidden />
      <div className="absolute top-[62%] left-[72%] h-15 w-17 rounded-lg bg-[#DDE3EC]" aria-hidden />
    </>
  );
}

function PinFlag({
  label,
  tone,
  className,
}: {
  label: string;
  tone: "dark" | "primary";
  className: string;
}) {
  return (
    <div className={`absolute flex flex-col items-center ${className}`}>
      <span
        className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-extrabold text-ink-inverse ${
          tone === "dark" ? "bg-navy" : "bg-primary"
        }`}
      >
        {label}
      </span>
      <span className={`h-3 w-0.5 ${tone === "dark" ? "bg-navy" : "bg-primary"}`} aria-hidden />
    </div>
  );
}

export function MapCanvas({
  variant = "idle",
  pickupLabel = "ALIM",
  dropoffLabel = "TESLİM",
  progress = 0.5,
  className = "",
  children,
}: Props) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      role="img"
      aria-label="Harita önizlemesi — canlı harita sağlayıcısı yakında"
    >
      <CityTexture />

      {(variant === "route" || variant === "progress") && (
        <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full" aria-hidden>
          <path
            d="M 80 430 C 150 390, 190 300, 235 250 S 315 150, 335 110"
            fill="none"
            stroke={variant === "progress" ? "rgba(0,87,255,0.25)" : "#0F172A"}
            strokeWidth={variant === "progress" ? 7 : 5}
            strokeLinecap="round"
            strokeDasharray={variant === "route" ? "0.1 12" : undefined}
          />
          {variant === "progress" ? (
            <path
              d="M 80 430 C 150 390, 190 300, 235 250 S 315 150, 335 110"
              pathLength={1}
              strokeDasharray={`${Math.max(0.02, Math.min(progress, 1))} 1`}
              fill="none"
              stroke="#0057FF"
              strokeWidth={7}
              strokeLinecap="round"
            />
          ) : null}
        </svg>
      )}

      {variant !== "idle" && variant !== "radar" ? (
        <>
          <PinFlag label={pickupLabel} tone="dark" className="top-[72%] left-[12%]" />
          <PinFlag label={dropoffLabel} tone="primary" className="top-[10%] left-[72%]" />
        </>
      ) : null}

      {variant === "progress" ? (
        <div
          className="absolute top-[42%] left-[52%] flex size-11 items-center justify-center rounded-full border-4 border-white bg-navy text-ink-inverse motion-safe:animate-pulse-ring"
          aria-hidden
        >
          <TruckIcon size={20} />
        </div>
      ) : null}

      {variant === "radar" ? (
        <>
          <div className="absolute inset-0 bg-navy/25" aria-hidden />
          <div className="absolute top-[28%] left-1/2 size-56 -translate-x-1/2" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-primary/25 motion-safe:animate-radar" />
            <span className="absolute inset-0 rounded-full bg-primary/25 motion-safe:animate-radar-late" />
            <span className="absolute inset-[74px] flex items-center justify-center rounded-full bg-primary shadow-primary">
              <PackageIcon size={32} className="text-ink-inverse" />
            </span>
          </div>
        </>
      ) : null}

      {children}
    </div>
  );
}
