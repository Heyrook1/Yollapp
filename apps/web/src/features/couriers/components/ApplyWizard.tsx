"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyCourierAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { TextInput } from "@/components/ui/Field";
import {
  ArrowLeftIcon,
  BikeIcon,
  CarIcon,
  CheckIcon,
  FootprintsIcon,
  LockIcon,
  TruckIcon,
} from "@/components/ui/icons";

type VehicleType = "WALK" | "BIKE" | "MOTORCYCLE" | "CAR";

const vehicles: { value: VehicleType; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: "WALK", label: "Yaya", hint: "Merkezde kısa mesafeler", icon: <FootprintsIcon size={26} /> },
  { value: "BIKE", label: "Bisiklet", hint: "Küçük ve hafif paketler", icon: <BikeIcon size={26} /> },
  { value: "MOTORCYCLE", label: "Motosiklet", hint: "En hızlı eşleşme", icon: <TruckIcon size={26} /> },
  { value: "CAR", label: "Otomobil", hint: "Büyük ve hacimli paketler", icon: <CarIcon size={26} /> },
];

type Step = 1 | 2 | 3;

const stepTitles: Record<Step, string> = {
  1: "Nasıl teslimat yapacaksın?",
  2: "Hangi bölgelerde çalışacaksın?",
  3: "Başvurunu gözden geçir",
};

type Props = {
  zoneNames: string[];
};

export function ApplyWizard({ zoneNames }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [vehicleType, setVehicleType] = useState<VehicleType>("MOTORCYCLE");
  const [zones, setZones] = useState<string[]>([]);
  const [customZone, setCustomZone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleZone(name: string) {
    setZones((prev) =>
      prev.includes(name) ? prev.filter((z) => z !== name) : [...prev, name],
    );
  }

  function addCustomZone() {
    const name = customZone.trim();
    if (!name) return;
    if (!zones.includes(name)) setZones((prev) => [...prev, name]);
    setCustomZone("");
  }

  function next() {
    setError(null);
    if (step === 2 && zones.length === 0) {
      setError("En az bir bölge seç.");
      return;
    }
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await applyCourierAction({
        vehicleType,
        activeZones: zones,
        documentPaths: [],
      });
      if (result.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 px-2 py-10 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-success-soft text-success-deep">
          <CheckIcon size={36} strokeWidth={3} />
        </span>
        <h2 className="text-3xl font-extrabold tracking-tight text-ink">Başvurun alındı</h2>
        <p className="max-w-xs font-semibold text-ink-secondary">
          Ekibimiz bilgilerini inceliyor. Onaylandığında iş almaya başlayabilirsin — genellikle 1
          iş günü sürer.
        </p>
        <Button href="/courier/jobs" className="w-full">
          Kurye paneline dön
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3.5">
        <IconButton
          label="Geri"
          variant="fill"
          onClick={() => (step === 1 ? router.back() : setStep((s) => (s - 1) as Step))}
        >
          <ArrowLeftIcon size={20} />
        </IconButton>
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.08em] text-ink-faint">
            ADIM {step}/3
          </p>
          <h2 className="text-2xl font-extrabold tracking-[-0.025em] text-ink">
            {stepTitles[step]}
          </h2>
        </div>
      </div>

      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-line"}`}
          />
        ))}
      </div>

      {step === 1 ? (
        <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Araç tipi">
          {vehicles.map((v) => {
            const selected = vehicleType === v.value;
            return (
              <button
                key={v.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setVehicleType(v.value)}
                className={`flex flex-col gap-2 rounded-[20px] p-4.5 text-left transition ${
                  selected
                    ? "bg-navy text-ink-inverse"
                    : "border border-[#EDF1F5] bg-fill-soft text-ink hover:bg-fill"
                }`}
              >
                <span className={selected ? "text-ink-inverse" : "text-ink-secondary"}>
                  {v.icon}
                </span>
                <span className="text-base font-extrabold">{v.label}</span>
                <span
                  className={`text-xs font-semibold ${selected ? "text-white/60" : "text-ink-faint"}`}
                >
                  {v.hint}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Çalışma bölgeleri">
            {[...new Set([...zoneNames, ...zones])].map((name) => {
              const selected = zones.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleZone(name)}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-extrabold transition ${
                    selected
                      ? "bg-navy text-ink-inverse"
                      : "bg-fill text-ink-secondary hover:bg-border/60"
                  }`}
                >
                  {selected ? <CheckIcon size={13} strokeWidth={3} /> : null}
                  {name}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <TextInput
              id="customZone"
              placeholder="Başka bölge ekle…"
              value={customZone}
              onChange={(e) => setCustomZone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomZone();
                }
              }}
              aria-label="Başka bölge ekle"
            />
            <Button variant="soft" onClick={addCustomZone}>
              Ekle
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <dl className="space-y-2.5 rounded-[20px] bg-fill-soft p-4.5 text-sm">
            <div className="flex justify-between">
              <dt className="font-semibold text-ink-secondary">Araç</dt>
              <dd className="font-extrabold text-ink">
                {vehicles.find((v) => v.value === vehicleType)?.label}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-ink-secondary">Bölgeler</dt>
              <dd className="text-right font-extrabold text-ink">{zones.join(", ")}</dd>
            </div>
          </dl>
          <p className="flex items-start gap-2 rounded-2xl bg-primary-soft px-4 py-3 text-sm font-semibold text-ink-secondary">
            <LockIcon size={16} className="mt-0.5 shrink-0 text-primary" />
            Kimlik ve belge doğrulama, güvenli teslimat ağı için gereklidir. Belge yükleme
            adımı yakında ekleniyor; başvurun şimdilik bu bilgilerle incelenir.
          </p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}

      {step === 3 ? (
        <Button size="lg" className="w-full" loading={pending} onClick={submit}>
          Başvuruyu gönder
        </Button>
      ) : (
        <Button size="lg" variant="dark" className="w-full" onClick={next}>
          Devam
        </Button>
      )}
    </div>
  );
}
