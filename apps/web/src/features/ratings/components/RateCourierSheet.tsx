"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitRatingAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { SheetPanel } from "@/components/ui/Sheet";

type Props = {
  shipmentId: string;
  courierLabel?: string | null;
};

const TAGS = ["Zamanında", "Nazik", "Özenli paket", "İletişim"] as const;

export function RateCourierSheet({ shipmentId, courierLabel }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [stars, setStars] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitRatingAction({ shipmentId, stars, tags });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-navy/50" role="dialog" aria-modal>
      <SheetPanel className="w-full">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-extrabold text-ink">Kuryeyi değerlendir</h2>
            <p className="text-sm font-semibold text-ink-secondary">
              {courierLabel ?? "Teslimatı yapan kurye"}
            </p>
          </div>
          <div className="flex gap-2" role="radiogroup" aria-label="Yıldız">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={stars === n}
                onClick={() => setStars(n)}
                className={`flex size-11 items-center justify-center rounded-full text-lg font-extrabold ${
                  n <= stars ? "bg-accent text-ink" : "bg-fill text-ink-faint"
                }`}
              >
                ★
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={tags.includes(tag)}
                onClick={() => toggleTag(tag)}
                className={`min-h-10 rounded-full px-3 text-xs font-extrabold ${
                  tags.includes(tag) ? "bg-navy text-ink-inverse" : "bg-fill text-ink-secondary"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          {error ? (
            <p className="text-sm font-bold text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button size="lg" className="w-full" loading={pending} onClick={submit}>
            Gönder
          </Button>
          <Button variant="soft" className="w-full" disabled={pending} onClick={() => setOpen(false)}>
            Sonra
          </Button>
        </div>
      </SheetPanel>
    </div>
  );
}
