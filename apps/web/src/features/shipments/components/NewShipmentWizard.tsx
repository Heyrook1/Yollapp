"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatTry } from "@yolla/core";
import { createClient } from "@/lib/supabase/client";
import { createShipmentAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, Textarea } from "@/components/ui/Field";
import {
  AddressAutocomplete,
  type SelectedPlace,
} from "@/features/maps/components/AddressAutocomplete";
import { GoogleRouteMap, type MapLatLng } from "@/features/maps/components/GoogleRouteMap";
import { resolveCoordsToPlace } from "@/features/maps/reverse-geocode-client";
import { IconButton } from "@/components/ui/IconButton";
import { SheetPanel } from "@/components/ui/Sheet";
import {
  ArrowLeftIcon,
  CheckIcon,
  DocumentIcon,
  LockIcon,
  MapPinIcon,
  NavigationIcon,
  PackageIcon,
  StarIcon,
} from "@/components/ui/icons";

type ZoneOption = { id: string; name: string; baseFeeMinor: number };
type SizeOption = { id: string; name: string; code: string };
type PinMode = "pickup" | "dropoff";

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

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function formatDuration(s: number): string {
  const min = Math.round(s / 60);
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  return `${h} sa ${min % 60} dk`;
}

async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Oturum gerekli");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

const windowFmt = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Gönderi oluşturma — Uber/Bolt tarzı:
 * Adım 1 full-bleed harita + A→B floating arama + alt sheet.
 */
export function NewShipmentWizard({ zones, sizeClasses }: Props) {
  const router = useRouter();
  const defaults = useMemo(() => defaultWindow(), []);

  const [step, setStep] = useState<Step>(1);
  const [pinMode, setPinMode] = useState<PinMode>("pickup");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupPlace, setPickupPlace] = useState<SelectedPlace | null>(null);
  const [dropoffPlace, setDropoffPlace] = useState<SelectedPlace | null>(null);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
  const [routeMeta, setRouteMeta] = useState<{
    distanceMeters: number;
    durationSeconds: number;
  } | null>(null);
  const [isTaxiCargo, setIsTaxiCargo] = useState(false);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [sizeClassId, setSizeClassId] = useState(sizeClasses[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemColor, setItemColor] = useState("");
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
  const routeKeyRef = useRef<string | null>(null);
  const mapControls = useRef<{ fitAll: () => void; goMyLocation: () => void } | null>(null);
  const pickupGeocodeSeq = useRef(0);
  const dropoffGeocodeSeq = useRef(0);

  const zone = zones.find((z) => z.id === zoneId);
  const size = sizeClasses.find((s) => s.id === sizeClassId);

  const onPickupChange = useCallback((coords: MapLatLng) => {
    const seq = ++pickupGeocodeSeq.current;
    setPickupPlace({
      placeId: `map:${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`,
      formattedAddress: "Adres bulunuyor…",
      ...coords,
    });
    setPickupAddress("Adres bulunuyor…");
    setRoutePolyline(null);
    setRouteMeta(null);
    routeKeyRef.current = null;
    void resolveCoordsToPlace(coords).then((place) => {
      if (seq !== pickupGeocodeSeq.current) return;
      setPickupPlace(place);
      setPickupAddress(place.formattedAddress);
    });
  }, []);

  const onDropoffChange = useCallback((coords: MapLatLng) => {
    const seq = ++dropoffGeocodeSeq.current;
    setDropoffPlace({
      placeId: `map:${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`,
      formattedAddress: "Adres bulunuyor…",
      ...coords,
    });
    setDropoffAddress("Adres bulunuyor…");
    setRoutePolyline(null);
    setRouteMeta(null);
    routeKeyRef.current = null;
    void resolveCoordsToPlace(coords).then((place) => {
      if (seq !== dropoffGeocodeSeq.current) return;
      setDropoffPlace(place);
      setDropoffAddress(place.formattedAddress);
    });
  }, []);

  // İki nokta hazırsa otomatik rota önizlemesi
  useEffect(() => {
    if (!pickupPlace || !dropoffPlace) {
      setRoutePolyline(null);
      setRouteMeta(null);
      routeKeyRef.current = null;
      return;
    }
    const key = `${pickupPlace.lat.toFixed(5)},${pickupPlace.lng.toFixed(5)}>${dropoffPlace.lat.toFixed(5)},${dropoffPlace.lng.toFixed(5)}`;
    if (routeKeyRef.current === key) return;
    routeKeyRef.current = key;

    let cancelled = false;
    void (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch("/api/v1/maps/route", {
          method: "POST",
          headers,
          body: JSON.stringify({
            origin: { lat: pickupPlace.lat, lng: pickupPlace.lng },
            destination: { lat: dropoffPlace.lat, lng: dropoffPlace.lng },
          }),
        });
        const json = (await res.json()) as {
          route?: {
            distanceMeters: number;
            durationSeconds: number;
            encodedPolyline: string;
          };
        };
        if (cancelled || !res.ok || !json.route) return;
        setRoutePolyline(json.route.encodedPolyline);
        setRouteMeta({
          distanceMeters: json.route.distanceMeters,
          durationSeconds: json.route.durationSeconds,
        });
      } catch {
        /* rota önizleme opsiyonel */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pickupPlace, dropoffPlace]);

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
      if (!pickupPlace) errors.pickupAddress = "Listeden veya haritadan alım noktası seçin.";
      if (!dropoffPlace) errors.dropoffAddress = "Listeden veya haritadan teslim noktası seçin.";
      if (pickupAddress === "Adres bulunuyor…") {
        errors.pickupAddress = "Alım adresi henüz çözülüyor, kısa bir süre bekleyin.";
      }
      if (dropoffAddress === "Adres bulunuyor…") {
        errors.dropoffAddress = "Teslimat adresi henüz çözülüyor, kısa bir süre bekleyin.";
      }
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
        isTaxiCargo,
        pickupAddress,
        dropoffAddress,
        pickupPlaceId: pickupPlace?.placeId,
        dropoffPlaceId: dropoffPlace?.placeId,
        pickupLat: pickupPlace?.lat,
        pickupLng: pickupPlace?.lng,
        dropoffLat: dropoffPlace?.lat,
        dropoffLng: dropoffPlace?.lng,
        recipientName,
        recipientPhone,
        notes: notes || undefined,
        itemDescription: itemDescription || undefined,
        itemColor: itemColor || undefined,
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

  // ——— Adım 1: immersive harita ———
  if (step === 1) {
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden bg-fill">
        <GoogleRouteMap
          className="absolute inset-0 h-full w-full"
          interactive
          edgeToEdge
          showControls={false}
          activePin={pinMode}
          pickup={pickupPlace}
          dropoff={dropoffPlace}
          encodedPolyline={routePolyline}
          onPickupChange={onPickupChange}
          onDropoffChange={onDropoffChange}
          controlRef={mapControls}
          fitPadding={{ top: 200, right: 40, bottom: 320, left: 40 }}
        />

        {/* Üst: geri + A→B kart */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="pointer-events-auto mx-auto mb-2 flex max-w-lg items-center gap-2">
            <IconButton label="Geri" onClick={back} variant="float">
              <ArrowLeftIcon size={20} />
            </IconButton>
            <div className="rounded-full bg-surface-elevated/95 px-3 py-2 shadow-float backdrop-blur-md">
              <p className="text-[11px] font-extrabold tracking-[0.08em] text-ink-faint">
                ADIM 1/3 · {stepTitles[1]}
              </p>
            </div>
          </div>

          <div className="pointer-events-auto mx-auto max-w-lg rounded-[22px] bg-surface-elevated/95 p-3 shadow-float backdrop-blur-md">
            <div className="flex gap-3">
              <div className="flex w-4 shrink-0 flex-col items-center pt-3 pb-2" aria-hidden>
                <span
                  className={`size-2.5 rounded-full ring-2 ring-offset-2 ring-offset-surface-elevated ${
                    pinMode === "pickup"
                      ? "bg-danger ring-danger"
                      : "bg-danger/40 ring-transparent"
                  }`}
                />
                <span className="my-1 w-px flex-1 bg-border" />
                <span
                  className={`size-2.5 rounded-full ring-2 ring-offset-2 ring-offset-surface-elevated ${
                    pinMode === "dropoff"
                      ? "bg-[#2563EB] ring-[#2563EB]"
                      : "bg-[#2563EB]/40 ring-transparent"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div
                  role="group"
                  aria-label="Alım adresi"
                  onClick={() => setPinMode("pickup")}
                  className={`w-full rounded-xl px-2 py-1 ${pinMode === "pickup" ? "bg-fill-soft" : ""}`}
                >
                  <p className="text-[10px] font-extrabold tracking-wide text-danger">ALIM</p>
                  <AddressAutocomplete
                    compact
                    hideHint
                    label="Alım adresi"
                    value={pickupAddress}
                    placeholder="Nereden alalım?"
                    onFocus={() => setPinMode("pickup")}
                    onTextChange={(v) => {
                      setPinMode("pickup");
                      setPickupAddress(v);
                      setPickupPlace(null);
                      setRoutePolyline(null);
                      setRouteMeta(null);
                    }}
                    onPlaceSelected={(place) => {
                      setPickupAddress(place.formattedAddress);
                      setPickupPlace(place);
                      setPinMode("dropoff");
                    }}
                  />
                  {fieldErrors.pickupAddress ? (
                    <p className="text-[11px] font-bold text-danger">{fieldErrors.pickupAddress}</p>
                  ) : null}
                </div>
                <div className="mx-2 border-t border-border/80" />
                <div
                  role="group"
                  aria-label="Teslimat adresi"
                  onClick={() => setPinMode("dropoff")}
                  className={`w-full rounded-xl px-2 py-1 ${
                    pinMode === "dropoff" ? "bg-primary-soft/50" : ""
                  }`}
                >
                  <p className="text-[10px] font-extrabold tracking-wide text-[#2563EB]">
                    TESLİMAT
                  </p>
                  <AddressAutocomplete
                    compact
                    hideHint
                    label="Teslimat adresi"
                    value={dropoffAddress}
                    placeholder="Nereye gidecek?"
                    onFocus={() => setPinMode("dropoff")}
                    onTextChange={(v) => {
                      setPinMode("dropoff");
                      setDropoffAddress(v);
                      setDropoffPlace(null);
                      setRoutePolyline(null);
                      setRouteMeta(null);
                    }}
                    onPlaceSelected={(place) => {
                      setDropoffAddress(place.formattedAddress);
                      setDropoffPlace(place);
                    }}
                  />
                  {fieldErrors.dropoffAddress ? (
                    <p className="text-[11px] font-bold text-danger">{fieldErrors.dropoffAddress}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAB */}
        <div className="pointer-events-none absolute right-3 bottom-[min(48vh,26rem)] z-20 flex flex-col gap-2">
          <button
            type="button"
            aria-label="Konumuma git"
            onClick={() => mapControls.current?.goMyLocation()}
            className="pointer-events-auto flex size-12 items-center justify-center rounded-full bg-surface-elevated text-navy shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <NavigationIcon size={20} />
          </button>
          <button
            type="button"
            aria-label="Tüm noktaları sığdır"
            onClick={() => mapControls.current?.fitAll()}
            className="pointer-events-auto flex size-12 items-center justify-center rounded-full bg-surface-elevated text-navy shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <MapPinIcon size={20} />
          </button>
        </div>

        {/* Alt sheet */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
          <div className="pointer-events-auto mx-auto max-w-lg">
            <SheetPanel className="max-h-[52dvh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="space-y-4">
                {routeMeta ? (
                  <div className="flex items-center justify-between rounded-2xl bg-navy px-4 py-3 text-white">
                    <div>
                      <p className="text-[10px] font-extrabold tracking-wide text-white/60">
                        TAHMİNİ SÜRE
                      </p>
                      <p className="text-lg font-extrabold">
                        ~{formatDuration(routeMeta.durationSeconds)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-extrabold tracking-wide text-white/60">
                        MESAFE
                      </p>
                      <p className="text-base font-extrabold">
                        {formatDistance(routeMeta.distanceMeters)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-ink-secondary">
                    {pinMode === "pickup"
                      ? "Alım noktasını ara veya haritaya dokun"
                      : "Teslimat noktasını ara veya haritaya dokun"}
                  </p>
                )}

                <div>
                  <p className="pb-2 text-[11px] font-extrabold tracking-[0.06em] text-ink-faint">
                    TESLİM BÖLGESİ
                  </p>
                  <div
                    className="flex gap-2 overflow-x-auto pb-1"
                    role="radiogroup"
                    aria-label="Teslim bölgesi"
                  >
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
                            : "bg-fill text-ink-secondary"
                        }`}
                      >
                        {z.name}
                        <span
                          className={
                            zoneId === z.id ? "tnum text-white/60" : "tnum text-ink-faint"
                          }
                        >
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

                <button
                  type="button"
                  aria-pressed={isTaxiCargo}
                  onClick={() => setIsTaxiCargo((v) => !v)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ${
                    isTaxiCargo ? "bg-primary-soft" : "bg-fill-soft"
                  }`}
                >
                  <span
                    className={`flex size-5 items-center justify-center rounded-md text-[11px] font-extrabold ${
                      isTaxiCargo ? "bg-primary text-ink-inverse" : "border-2 border-border"
                    }`}
                    aria-hidden
                  >
                    {isTaxiCargo ? "✓" : null}
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-ink">Taksi ile Gönder</span>
                    <span className="block text-[11px] font-semibold text-ink-faint">
                      Onaylı taksi kuryeleri — yolcu taşıyorken kapalı
                    </span>
                  </span>
                </button>

                <div className="grid grid-cols-1 gap-3">
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

                <Button size="lg" variant="dark" className="w-full" onClick={next}>
                  Devam
                </Button>
              </div>
            </SheetPanel>
          </div>
        </div>
      </div>
    );
  }

  // ——— Adım 2–3: klasik sheet akış ———
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
            <Field id="itemDescription" label="Malın cinsi" hint="Takip kartında görünür">
              <TextInput
                id="itemDescription"
                maxLength={120}
                placeholder="Örn. Ayakkabı kutusu, evrak zarfı"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
              />
            </Field>
            <Field id="itemColor" label="Renk (opsiyonel)">
              <TextInput
                id="itemColor"
                maxLength={40}
                placeholder="Örn. Siyah"
                value={itemColor}
                onChange={(e) => setItemColor(e.target.value)}
              />
            </Field>
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
                <div className="flex justify-between gap-3">
                  <dt>Rota</dt>
                  <dd className="max-w-[60%] truncate text-right font-extrabold text-ink">
                    {pickupAddress || "—"} → {dropoffAddress || "—"}
                  </dd>
                </div>
                {routeMeta ? (
                  <div className="flex justify-between">
                    <dt>Mesafe · Süre</dt>
                    <dd className="font-extrabold text-ink">
                      {formatDistance(routeMeta.distanceMeters)} · ~
                      {formatDuration(routeMeta.durationSeconds)}
                    </dd>
                  </div>
                ) : null}
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
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger"
          >
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
                  {isExpress ? " · Yolla Ekspres" : ""}
                  {isTaxiCargo ? " · Taksi" : ""} — {previewWindow}
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
