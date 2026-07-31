"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatTry } from "@yolla/core";
import { createShipmentAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, Textarea } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { SheetPanel } from "@/components/ui/Sheet";
import { MapCanvas } from "@/components/ui/MapCanvas";
import {
  ArrowLeftIcon,
  CheckIcon,
  DocumentIcon,
  LockIcon,
  PackageIcon,
  StarIcon,
} from "@/components/ui/icons";

type ZoneOption = { id: string; name: string; baseFeeMinor: number };
type SizeOption = { id: string; name: string; code: string };

type Props = {
  zones: ZoneOption[];
  sizeClasses: SizeOption[];
};

type Step = 1 | 2 | 3;

const stepTitles: Record<Step, string> = {
  1: "Nereden nereye?",
  2: "Ne gönderiyorsun?",
  3: "Teslimatını planla",
};

const sizeHints: Record<string, string> = {
  S: "Zarf, belge veya ayakkabı kutusuna kadar",
  M: "10 kilograma kadar",
  L: "Büyük kutu veya hacimli ürün",
  XL: "Çok büyük / özel taşıma gerektiren ürün",
};

function sizeIcon(code: string) {
  if (code === "S") return <DocumentIcon size={26} />;
  if (code === "XL") return <StarIcon size={26} />;
  return <PackageIcon size={26} />;
}

function defaultWindow() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 2);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  return { start, end };
}

function toLocalInputValue(d: Date) {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

const windowFmt = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function NewShipmentWizard({ zones, sizeClasses }: Props) {
  const router = useRouter();
  const defaults = useMemo(() => defaultWindow(), []);

  const [step, setStep] = useState<Step>(1);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [sizeClassId, setSizeClassId] = useState(sizeClasses[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState<"standard" | "scheduled">("standard");
  const [isExpress, setIsExpress] = useState(false);
  const [windowStartsAt, setWindowStartsAt] = useState(toLocalInputValue(defaults.start));
  const [windowEndsAt, setWindowEndsAt] = useState(toLocalInputValue(defaults.end));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ shipmentId: string; amountLabel: string | null } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const zone = zones.find((z) => z.id === zoneId);
  const size = sizeClasses.find((s) => s.id === sizeClassId);

  if (zones.length === 0 || sizeClasses.length === 0) {
    return (
      <div className="px-6 py-10">
        <p className="rounded-2xl bg-warning-soft px-4 py-3 text-sm font-bold text-warning-deep">
          Bölge/boyut kataloğu boş. Yönetici `pnpm db:seed` çalıştırmalı.
        </p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-elevated">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-success-soft text-success-deep">
            <CheckIcon size={36} strokeWidth={3} />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Gönderi hazır</h1>
          <p className="font-semibold text-ink-secondary">
            Fiyat teklifin oluştu{result.amountLabel ? ":" : "."}
          </p>
          {result.amountLabel ? (
            <p className="tnum text-[44px] font-extrabold tracking-[-0.03em] text-ink">
              {result.amountLabel}
            </p>
          ) : null}
          <p className="text-sm font-semibold text-ink-faint">
            Ödemeyi tamamladığında gönderin kurye havuzuna açılır.
          </p>
        </div>
        <div className="flex flex-col gap-3 px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <Button
            size="lg"
            className="w-full"
            onClick={() => router.push(`/sender/shipments/${result.shipmentId}`)}
          >
            Ödemeye geç
          </Button>
          <Button variant="soft" className="w-full" onClick={() => router.push("/sender")}>
            Ana sayfaya dön
          </Button>
        </div>
      </div>
    );
  }

  function validateStep(current: Step): boolean {
    const errors: Record<string, string> = {};
    if (current === 1) {
      if (pickupAddress.trim().length < 5) errors.pickupAddress = "Alım adresi çok kısa.";
      if (dropoffAddress.trim().length < 5) errors.dropoffAddress = "Teslim adresi çok kısa.";
      if (!zoneId) errors.zoneId = "Bölge seçin.";
      if (recipientName.trim().length < 2) errors.recipientName = "Alıcı adı en az 2 karakter olmalı.";
      const digits = recipientPhone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15)
        errors.recipientPhone = "Geçerli bir telefon girin (en az 10 rakam).";
    }
    if (current === 2 && !sizeClassId) errors.sizeClassId = "Paket boyutu seçin.";
    if (current === 3 && plan === "scheduled") {
      if (!windowStartsAt || !windowEndsAt) errors.window = "Tarih aralığı seçin.";
      else if (new Date(windowEndsAt) <= new Date(windowStartsAt))
        errors.window = "Bitiş, başlangıçtan sonra olmalı.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  }

  function back() {
    setServerError(null);
    if (step === 1) {
      router.back();
      return;
    }
    setStep((s) => (s - 1) as Step);
  }

  function submit() {
    setServerError(null);
    const win =
      plan === "standard"
        ? defaultWindow()
        : { start: new Date(windowStartsAt), end: new Date(windowEndsAt) };

    startTransition(async () => {
      const res = await createShipmentAction({
        zoneId,
        sizeClassId,
        isExpress,
        pickupAddress,
        dropoffAddress,
        recipientName,
        recipientPhone,
        notes: notes || undefined,
        windowStartsAt: win.start.toISOString(),
        windowEndsAt: win.end.toISOString(),
      });
      setConfirming(false);
      if (res.ok && res.shipmentId) {
        setResult({ shipmentId: res.shipmentId, amountLabel: res.amountLabel ?? null });
      } else {
        setServerError(res.message);
      }
    });
  }

  const previewWindow =
    plan === "standard"
      ? `Bugün ${windowFmt.format(defaults.start)} – ${windowFmt.format(defaults.end)} arası teslim`
      : windowStartsAt && windowEndsAt
        ? `${new Date(windowStartsAt).toLocaleDateString("tr-TR")} ${windowFmt.format(new Date(windowStartsAt))} – ${windowFmt.format(new Date(windowEndsAt))}`
        : "Tarih ve saat aralığı seç";

  return (
    <div className="flex min-h-screen flex-col bg-surface-elevated">
      <div className="flex items-center gap-3.5 px-6 pb-3 pt-[max(3.5rem,env(safe-area-inset-top))]">
        <IconButton label="Geri" onClick={back} variant="fill">
          <ArrowLeftIcon size={20} />
        </IconButton>
        <div className="flex-1">
          <p className="text-[11px] font-extrabold tracking-[0.08em] text-ink-faint">
            ADIM {step}/3
          </p>
          <h1 className="text-2xl font-extrabold tracking-[-0.025em] text-ink">
            {stepTitles[step]}
          </h1>
        </div>
      </div>

      <div className="flex gap-1.5 px-6 pb-2" aria-hidden>
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-line"}`}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
        {step === 1 ? (
          <div className="space-y-5">
            <MapCanvas
              variant="route"
              className="h-40 rounded-[24px]"
              pickupLabel="ALIM"
              dropoffLabel="TESLİM"
            />
            <div className="flex gap-4">
              <div className="flex flex-col items-center py-5" aria-hidden>
                <span className="size-3 rounded-full bg-navy" />
                <span className="my-1.5 w-0.5 flex-1 bg-border" />
                <span className="size-3 rounded-[3px] bg-primary" />
              </div>
              <div className="flex-1 space-y-4">
                <Field id="pickup" label="Alım adresi" error={fieldErrors.pickupAddress}>
                  <TextInput
                    id="pickup"
                    placeholder="Örn. Bedrettin Demirel Cad. 24, Lefkoşa"
                    value={pickupAddress}
                    error={fieldErrors.pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                  />
                </Field>
                <Field id="dropoff" label="Teslim adresi" error={fieldErrors.dropoffAddress}>
                  <TextInput
                    id="dropoff"
                    placeholder="Örn. Karakum Sitesi B Blok, Girne"
                    value={dropoffAddress}
                    error={fieldErrors.dropoffAddress}
                    onChange={(e) => setDropoffAddress(e.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div>
              <p className="pb-2 text-sm font-bold text-ink">Teslim bölgesi</p>
              <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Teslim bölgesi">
                {zones.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    role="radio"
                    aria-checked={zoneId === z.id}
                    onClick={() => setZoneId(z.id)}
                    className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-extrabold transition ${
                      zoneId === z.id
                        ? "bg-navy text-ink-inverse"
                        : "bg-fill text-ink-secondary hover:bg-border/60"
                    }`}
                  >
                    {z.name}
                    <span className={zoneId === z.id ? "tnum text-white/60" : "tnum text-ink-faint"}>
                      {formatTry(z.baseFeeMinor)}+
                    </span>
                  </button>
                ))}
              </div>
              {fieldErrors.zoneId ? (
                <p role="alert" className="pt-1 text-sm font-semibold text-danger">
                  {fieldErrors.zoneId}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Field id="recipientName" label="Alıcı adı" error={fieldErrors.recipientName}>
                <TextInput
                  id="recipientName"
                  placeholder="Örn. Ayşe Kaya"
                  autoComplete="name"
                  value={recipientName}
                  error={fieldErrors.recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </Field>
              <Field
                id="recipientPhone"
                label="Alıcı telefon"
                hint="Örn. 0533 123 45 67"
                error={fieldErrors.recipientPhone}
              >
                <TextInput
                  id="recipientPhone"
                  type="tel"
                  inputMode="tel"
                  placeholder="0533 123 45 67"
                  value={recipientPhone}
                  error={fieldErrors.recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                />
              </Field>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Paket boyutu">
              {sizeClasses.map((s) => {
                const selected = sizeClassId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSizeClassId(s.id)}
                    className={`flex flex-col gap-2 rounded-[20px] p-4.5 text-left transition ${
                      selected
                        ? "bg-navy text-ink-inverse"
                        : "border border-[#EDF1F5] bg-fill-soft text-ink hover:bg-fill"
                    }`}
                  >
                    <span className={selected ? "text-ink-inverse" : "text-ink-secondary"}>
                      {sizeIcon(s.code)}
                    </span>
                    <span className="text-base font-extrabold">{s.name}</span>
                    <span
                      className={`text-xs font-semibold ${selected ? "text-white/60" : "text-ink-faint"}`}
                    >
                      {sizeHints[s.code] ?? `Boyut sınıfı ${s.code}`}
                    </span>
                  </button>
                );
              })}
            </div>
            <Field
              id="notes"
              label="Kurye notu (opsiyonel)"
              hint="Kırılabilir, kapı kodu, kat bilgisi…"
            >
              <Textarea
                id="notes"
                maxLength={500}
                placeholder="Örn. Kırılabilir — dik taşıyın."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div role="radiogroup" aria-label="Teslimat zamanı">
              <p className="pb-1.5 text-[13px] font-extrabold tracking-[0.06em] text-ink-faint">
                NE ZAMAN?
              </p>
              <button
                type="button"
                role="radio"
                aria-checked={plan === "standard"}
                onClick={() => setPlan("standard")}
                className="flex min-h-16 w-full items-center gap-3.5 border-b border-line text-left"
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${
                    plan === "standard"
                      ? "bg-primary text-ink-inverse"
                      : "border-2 border-border"
                  }`}
                  aria-hidden
                >
                  {plan === "standard" ? "✓" : null}
                </span>
                <span className="flex flex-1 flex-col py-2">
                  <span className="text-[17px] font-extrabold text-ink">Standart</span>
                  <span className="text-[13px] font-semibold text-ink-faint">
                    Bugün {windowFmt.format(defaults.start)} – {windowFmt.format(defaults.end)}{" "}
                    arası teslim
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={plan === "scheduled"}
                onClick={() => setPlan("scheduled")}
                className="flex min-h-16 w-full items-center gap-3.5 text-left"
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${
                    plan === "scheduled"
                      ? "bg-primary text-ink-inverse"
                      : "border-2 border-border"
                  }`}
                  aria-hidden
                >
                  {plan === "scheduled" ? "✓" : null}
                </span>
                <span className="flex flex-1 flex-col py-2">
                  <span className="text-[17px] font-extrabold text-ink">Planlı</span>
                  <span className="text-[13px] font-semibold text-ink-faint">
                    Tarih ve saat aralığı seç
                  </span>
                </span>
              </button>
              {plan === "scheduled" ? (
                <div className="grid grid-cols-1 gap-4 pt-3">
                  <Field id="windowStart" label="Pencere başlangıcı" error={fieldErrors.window}>
                    <TextInput
                      id="windowStart"
                      type="datetime-local"
                      value={windowStartsAt}
                      error={fieldErrors.window}
                      onChange={(e) => setWindowStartsAt(e.target.value)}
                    />
                  </Field>
                  <Field id="windowEnd" label="Pencere bitişi" error={fieldErrors.window}>
                    <TextInput
                      id="windowEnd"
                      type="datetime-local"
                      value={windowEndsAt}
                      error={fieldErrors.window}
                      onChange={(e) => setWindowEndsAt(e.target.value)}
                    />
                  </Field>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              aria-pressed={isExpress}
              onClick={() => setIsExpress((v) => !v)}
              className={`flex w-full items-center gap-3.5 rounded-[20px] p-4.5 text-left transition ${
                isExpress ? "bg-accent-soft" : "bg-fill-soft hover:bg-fill"
              }`}
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${
                  isExpress ? "bg-accent text-ink-inverse" : "border-2 border-border"
                }`}
                aria-hidden
              >
                {isExpress ? "✓" : null}
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-[16px] font-extrabold text-ink">
                  Yolla Ekspres{" "}
                  <span className="ml-1 rounded-full bg-accent-soft px-2 py-0.5 align-middle text-[11px] font-extrabold text-warning-deep">
                    EN HIZLI
                  </span>
                </span>
                <span className="text-[13px] font-semibold text-ink-faint">
                  Öncelikli eşleşme — prim ücreti teklife eklenir
                </span>
              </span>
            </button>

            <div className="space-y-2.5 rounded-[20px] bg-fill-soft p-4.5">
              <p className="text-[13px] font-extrabold tracking-[0.06em] text-ink-faint">ÖZET</p>
              <dl className="space-y-1.5 text-sm font-semibold text-ink-secondary">
                <div className="flex justify-between">
                  <dt>Rota</dt>
                  <dd className="max-w-[60%] truncate text-right font-extrabold text-ink">
                    {pickupAddress || "—"} → {dropoffAddress || "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Bölge · Boyut</dt>
                  <dd className="font-extrabold text-ink">
                    {zone?.name} · {size?.name}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Teslimat</dt>
                  <dd className="font-extrabold text-ink">{previewWindow}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Başlangıç fiyatı</dt>
                  <dd className="tnum font-extrabold text-ink">
                    {zone ? `${formatTry(zone.baseFeeMinor)}+` : "—"}
                  </dd>
                </div>
              </dl>
              <p className="text-xs font-semibold text-ink-faint">
                Kesin fiyat sunucuda hesaplanır ve bir sonraki adımda gösterilir.
              </p>
            </div>
          </div>
        ) : null}

        {serverError ? (
          <p role="alert" className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
            {serverError}
          </p>
        ) : null}
      </div>

      <div className="border-t border-line px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3.5">
        {step === 3 ? (
          <div className="space-y-2.5">
            <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-success-deep">
              <LockIcon size={13} /> Fiyat sunucuda hesaplanır — güvenli teklif
            </p>
            <Button
              size="lg"
              className="w-full"
              loading={pending}
              onClick={() => {
                if (validateStep(3)) setConfirming(true);
              }}
            >
              Fiyatı gör ve gönder
            </Button>
          </div>
        ) : (
          <Button size="lg" variant="dark" className="w-full" onClick={next}>
            Devam
          </Button>
        )}
      </div>

      {confirming ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-navy/50"
          role="dialog"
          aria-modal="true"
          aria-label="Gönderiyi onayla"
        >
          <SheetPanel className="w-full">
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold tracking-tight text-ink">
                  Gönderi oluşturulsun mu?
                </h2>
                <p className="text-sm font-semibold text-ink-secondary">
                  {zone?.name} · {size?.name}
                  {isExpress ? " · Yolla Ekspres" : ""} — {previewWindow}
                </p>
              </div>
              <div className="flex flex-col gap-2.5">
                <Button size="lg" loading={pending} onClick={submit} className="w-full">
                  Onayla ve fiyat al
                </Button>
                <Button
                  variant="soft"
                  disabled={pending}
                  onClick={() => setConfirming(false)}
                  className="w-full"
                >
                  Vazgeç
                </Button>
              </div>
            </div>
          </SheetPanel>
        </div>
      ) : null}
    </div>
  );
}
