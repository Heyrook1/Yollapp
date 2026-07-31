import { AppShell } from "@/components/ui/AppShell";
import { BottomTabBar } from "@/components/ui/BottomTabBar";
import { shellMessages } from "@/components/ui/messages";

const tabs = [
  { href: "/courier/jobs", label: shellMessages.courierMap, match: "exact" as const },
  { href: "/courier/jobs/mine", label: shellMessages.courierMine, match: "exact" as const },
  { href: "/courier/apply", label: shellMessages.courierApply, match: "prefix" as const },
];

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell withTabPad>{children}</AppShell>
      <BottomTabBar items={tabs} />
    </>
  );
}
