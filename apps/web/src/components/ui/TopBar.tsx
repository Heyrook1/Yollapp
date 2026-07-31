import type { ReactNode } from "react";
import { IconButton } from "./IconButton";
import { ArrowLeftIcon } from "./icons";

type Props = {
  title?: string;
  backHref?: string;
  right?: ReactNode;
  /** Harita üstü gibi yüzer görünüm (arka plan yok). */
  floating?: boolean;
};

export function TopBar({ title, backHref, right, floating = false }: Props) {
  return (
    <header
      className={
        floating
          ? "pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]"
          : "sticky top-0 z-30 flex items-center justify-between gap-3 bg-surface/90 px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur"
      }
    >
      <div className="pointer-events-auto flex items-center gap-3">
        {backHref ? (
          <IconButton
            href={backHref}
            label="Geri"
            variant={floating ? "float" : "fill"}
          >
            <ArrowLeftIcon size={20} />
          </IconButton>
        ) : null}
        {title ? (
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        ) : null}
      </div>
      {right ? <div className="pointer-events-auto flex items-center gap-2">{right}</div> : null}
    </header>
  );
}
