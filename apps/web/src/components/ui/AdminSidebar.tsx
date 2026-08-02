"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartIcon,
  MapPinIcon,
  PackageIcon,
  ShieldIcon,
  UsersIcon,
  type IconProps,
} from "./icons";

type NavItem = {
  href: string;
  label: string;
  icon: (props: IconProps) => React.ReactNode;
  match: "exact" | "prefix";
};

const items: NavItem[] = [
  { href: "/admin", label: "Operasyon", icon: ChartIcon, match: "exact" },
  { href: "/admin/map", label: "Canlı harita", icon: MapPinIcon, match: "exact" },
  { href: "/admin/shipments", label: "Gönderiler", icon: PackageIcon, match: "prefix" },
  { href: "/admin/couriers", label: "Kurye onayları", icon: UsersIcon, match: "prefix" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-surface-elevated max-lg:w-16">
      <div className="flex items-center gap-2.5 px-5 py-5 max-lg:justify-center max-lg:px-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-navy text-ink-inverse">
          <ShieldIcon size={18} />
        </span>
        <div className="max-lg:hidden">
          <p className="text-sm font-extrabold tracking-widest text-ink">YOLLA</p>
          <p className="text-[11px] font-bold text-ink-faint">Operasyon paneli</p>
        </div>
      </div>
      <nav className="flex-1 px-3 max-lg:px-2" aria-label="Admin navigasyonu">
        <ul className="space-y-1">
          {items.map((item) => {
            const active =
              item.match === "exact"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm max-lg:justify-center max-lg:px-0 ${
                    active
                      ? "bg-primary-soft font-extrabold text-primary"
                      : "font-bold text-ink-secondary hover:bg-fill"
                  }`}
                >
                  <Icon size={19} />
                  <span className="max-lg:hidden">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="px-5 pb-5 text-[11px] font-bold text-ink-faint max-lg:hidden">
        Yalnızca yetkili hesaplar
      </p>
    </aside>
  );
}
