import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { shellMessages } from "@/components/ui/messages";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between bg-surface-dark px-6 pb-10 pt-16 text-ink-inverse">
      <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-8">
        <Image
          src="/brand/yolla-mark.png"
          alt="YOLLA"
          width={280}
          height={320}
          priority
          className="h-auto w-[min(72vw,280px)] object-contain"
        />
        <p className="sr-only">
          {shellMessages.taglineEverywhere}. {shellMessages.taglineEverything}.{" "}
          {shellMessages.taglineFaster}.
        </p>
        <p className="text-center text-base tracking-wide" aria-hidden>
          <span className="text-yolla-blue">{shellMessages.taglineEverywhere}</span>
          <span className="mx-2 text-ink-inverse/40">·</span>
          <span className="text-yolla-orange">{shellMessages.taglineEverything}</span>
          <span className="mx-2 text-ink-inverse/40">·</span>
          <span className="text-ink-inverse">{shellMessages.taglineFaster}</span>
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button href="/signup" className="w-full">
          {shellMessages.start}
        </Button>
        <Button href="/login" variant="secondary" className="w-full border-white/20 bg-transparent text-ink-inverse hover:bg-white/10">
          {shellMessages.login}
        </Button>
        <div className="flex justify-center gap-4 pt-2 text-sm text-ink-inverse/70">
          <a href="/sender" className="underline-offset-4 hover:underline">
            Gönderici
          </a>
          <a href="/courier/jobs" className="underline-offset-4 hover:underline">
            Kurye
          </a>
        </div>
      </div>
    </main>
  );
}
