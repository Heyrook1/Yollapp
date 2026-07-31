import { AppShell } from "@/components/ui/AppShell";
import { BottomTabBar } from "@/components/ui/BottomTabBar";
import { shellMessages } from "@/components/ui/messages";

const tabs = [
  { href: "/sender", label: shellMessages.senderHome, match: "exact" as const },
  { href: "/sender/shipments", label: shellMessages.senderList, match: "prefix" as const },
  { href: "/login", label: shellMessages.senderAccount, match: "exact" as const },
];

export default function SenderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell withTabPad>{children}</AppShell>
      <BottomTabBar items={tabs} />
    </>
  );
}
