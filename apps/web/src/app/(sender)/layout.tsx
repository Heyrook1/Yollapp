import { BottomTabBar, type TabItem } from "@/components/ui/BottomTabBar";
import { shellMessages as m } from "@/components/ui/messages";

const tabs: TabItem[] = [
  { href: "/sender", label: m.navHome, icon: "home", match: "exact" },
  { href: "/sender/shipments", label: m.navShipments, icon: "shipments", match: "prefix" },
  { href: "/sender/map", label: m.navMap, icon: "map", match: "exact" },
  { href: "/sender/wallet", label: m.navWallet, icon: "wallet", match: "exact" },
  { href: "/sender/profile", label: m.navProfile, icon: "profile", match: "exact" },
];

export default function SenderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomTabBar items={tabs} />
    </>
  );
}
