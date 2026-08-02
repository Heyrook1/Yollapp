"use client";

import Link from "next/link";
import { setPreferredModeClient, type AppMode, homePathForMode } from "@/lib/mode";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { ReactNode } from "react";

type Props = {
  mode: AppMode;
  title: string;
  detail?: string;
  icon?: ReactNode;
  className?: string;
};

/** Mod değiştir — cookie yazar, hedef shell'e gider. */
export function ModeSwitchLink({ mode, title, detail, icon, className }: Props) {
  const href = homePathForMode(mode);
  return (
    <Link
      href={href}
      onClick={() => setPreferredModeClient(mode)}
      className={
        className ??
        "flex min-h-16 items-center gap-3.5 py-2"
      }
    >
      {icon ? (
        <span className="flex size-10 items-center justify-center rounded-full bg-fill text-ink">
          {icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-extrabold text-ink">{title}</span>
        {detail ? (
          <span className="text-[12px] font-semibold text-ink-faint">{detail}</span>
        ) : null}
      </span>
      <ChevronRightIcon size={18} className="text-ink-faint" />
    </Link>
  );
}
