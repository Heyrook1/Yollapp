import { BottomTabBar, type TabItem } from "@/components/ui/BottomTabBar";
import { shellMessages as m } from "@/components/ui/messages";

const tabs: TabItem[] = [
  { href: "/courier/jobs", label: m.navHome, icon: "home", match: "exact" },
  { href: "/courier/jobs/mine", label: m.navJobs, icon: "jobs", match: "exact" },
  { href: "/courier/wallet", label: m.navWallet, icon: "wallet", match: "exact" },
  { href: "/courier/profile", label: m.navProfile, icon: "profile", match: "prefix" },
];

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomTabBar items={tabs} />
    </>
  );
}
