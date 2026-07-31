"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseIcon,
  HomeIcon,
  MapPinIcon,
  PackageIcon,
  UserIcon,
  WalletIcon,
  type IconProps,
} from "./icons";

export type TabIcon = "home" | "shipments" | "jobs" | "map" | "wallet" | "profile";

const iconMap: Record<TabIcon, (props: IconProps) => React.ReactNode> = {
  home: HomeIcon,
  shipments: PackageIcon,
  jobs: BriefcaseIcon,
  map: MapPinIcon,
  wallet: WalletIcon,
  profile: UserIcon,
};

export type TabItem = {
  href: string;
  label: string;
  icon: TabIcon;
  match?: "exact" | "prefix";
};

export function BottomTabBar({ items }: { items: TabItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-elevated/95 backdrop-blur"
      aria-label="Ana navigasyon"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        {items.map((item) => {
          const active =
            item.match === "exact"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = iconMap[item.icon];
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] ${
                  active ? "font-extrabold text-ink" : "font-bold text-[#B6C0CE]"
                }`}
              >
                <Icon size={24} strokeWidth={active ? 2.2 : 2} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
