"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type TabItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

export function BottomTabBar({ items }: { items: TabItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-elevated/95 backdrop-blur safe-bottom"
      aria-label="Ana navigasyon"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {items.map((item) => {
          const active =
            item.match === "exact"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[12px] px-2 text-xs font-semibold ${
                  active ? "text-yolla-blue" : "text-ink-secondary"
                }`}
              >
                <span
                  className={`h-1 w-6 rounded-full ${active ? "bg-yolla-blue" : "bg-transparent"}`}
                  aria-hidden
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
