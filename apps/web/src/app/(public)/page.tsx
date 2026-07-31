import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { shellMessages as m } from "@/components/ui/messages";

const trustItems = [
  m.trustVerifiedCouriers,
  m.trustLiveTracking,
  m.trustDeliveryCode,
] as const;

export default function WelcomePage() {
  return (
    <main className="relative flex min-h-screen flex-col justify-between bg-[radial-gradient(130%_90%_at_85%_0%,#152B50_0%,#0B1220_58%)] px-7 pb-[max(2.75rem,env(safe-area-inset-bottom))] pt-[max(5rem,env(safe-area-inset-top))] text-ink-inverse">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-7">
        <Image
          src="/brand/yolla-mark.png"
          alt="YOLLA"
          width={150}
          height={150}
          priority
          className="-ml-2 h-auto w-[150px] object-contain"
        />
        <div className="space-y-2.5">
          <h1 className="text-[46px] font-extrabold leading-[1.06] tracking-[-0.04em]">
            {m.taglineLine1}
            <br />
            {m.taglineLine2}
            <br />
            <span className="text-[#4d8dff]">{m.taglineLine3}</span>
          </h1>
          <p className="text-base font-semibold leading-relaxed text-white/60">
            {m.welcomeSubtitle}
          </p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col gap-3.5">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 pb-1.5" aria-label="Güven unsurları">
          {trustItems.map((item) => (
            <li
              key={item}
              className="flex items-center gap-1.5 text-[13px] font-bold text-white/75"
            >
              <CheckIcon size={15} strokeWidth={3} className="text-[#4ADE80]" />
              {item}
            </li>
          ))}
        </ul>
        <Button href="/signup" size="lg" className="w-full">
          {m.sendPackage}
        </Button>
        <Button
          href="/login"
          variant="secondary"
          className="w-full border-white/25 bg-transparent text-ink-inverse hover:bg-white/10"
        >
          {m.login}
        </Button>
        <Link
          href="/courier/apply"
          className="flex min-h-11 items-center justify-center text-[15px] font-extrabold text-accent"
        >
          {m.earnByDelivering} →
        </Link>
      </div>
    </main>
  );
}
