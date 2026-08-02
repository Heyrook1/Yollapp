"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { TextInput } from "@/components/ui/Field";

export type SelectedPlace = {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
};

type Suggestion = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
};

type Props = {
  label: string;
  value: string;
  onTextChange: (value: string) => void;
  onPlaceSelected: (place: SelectedPlace) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Uber tarzı floating satır — label/hint gizlenir */
  compact?: boolean;
  hideHint?: boolean;
  /** Odak geldiğinde (aktif pin seçimi) */
  onFocus?: () => void;
  inputClassName?: string;
};

async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Oturum gerekli");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function AddressAutocomplete({
  label,
  value,
  onTextChange,
  onPlaceSelected,
  placeholder,
  disabled,
  compact = false,
  hideHint = false,
  onFocus,
  inputClassName,
}: Props) {
  const listId = useId();
  const sessionToken = useRef(crypto.randomUUID());
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        try {
          setError(null);
          const headers = await authHeaders();
          const res = await fetch("/api/v1/maps/autocomplete", {
            method: "POST",
            headers,
            body: JSON.stringify({
              query: value.trim(),
              sessionToken: sessionToken.current,
            }),
          });
          const json = (await res.json()) as {
            suggestions?: Suggestion[];
            error?: string;
          };
          if (!res.ok) {
            setError(json.error ?? "Adres araması başarısız.");
            setSuggestions([]);
            return;
          }
          setSuggestions(json.suggestions ?? []);
        } catch {
          setError("Adres aramasına bağlanılamadı.");
        }
      });
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  async function selectSuggestion(s: Suggestion) {
    try {
      setError(null);
      const headers = await authHeaders();
      const res = await fetch("/api/v1/maps/place", {
        method: "POST",
        headers,
        body: JSON.stringify({
          placeId: s.placeId,
          sessionToken: sessionToken.current,
        }),
      });
      const json = (await res.json()) as {
        place?: {
          placeId: string;
          formattedAddress: string;
          location: { lat: number; lng: number };
        };
        error?: string;
      };
      if (!res.ok || !json.place) {
        setError(json.error ?? "Adres seçilemedi.");
        return;
      }
      onTextChange(json.place.formattedAddress);
      onPlaceSelected({
        placeId: json.place.placeId,
        formattedAddress: json.place.formattedAddress,
        lat: json.place.location.lat,
        lng: json.place.location.lng,
      });
      setSuggestions([]);
      // Yeni arama oturumu — Places faturalandırma oturumu biter.
      sessionToken.current = crypto.randomUUID();
    } catch {
      setError("Adres detayı alınamadı.");
    }
  }

  return (
    <div className={`relative ${compact ? "" : "space-y-1"}`}>
      {compact ? (
        <label htmlFor={listId} className="sr-only">
          {label}
        </label>
      ) : (
        <label htmlFor={listId} className="text-sm font-bold text-ink">
          {label}
        </label>
      )}
      <TextInput
        id={listId}
        value={value}
        disabled={disabled || pending}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={onFocus}
        onChange={(e) => onTextChange(e.target.value)}
        className={
          compact
            ? `!min-h-11 !rounded-xl !border-0 !bg-transparent !px-0 py-1 text-[15px] !font-bold shadow-none focus:!border-transparent ${inputClassName ?? ""}`
            : inputClassName
        }
      />
      {suggestions.length > 0 ? (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-border bg-surface-elevated py-1 shadow-float"
        >
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                className="flex min-h-11 w-full flex-col px-3 py-2.5 text-left hover:bg-fill-soft focus-visible:bg-fill-soft focus-visible:outline-none"
                onClick={() => void selectSuggestion(s)}
              >
                <span className="text-sm font-bold text-ink">{s.primaryText}</span>
                <span className="text-xs font-semibold text-ink-secondary">
                  {s.secondaryText}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="mt-1 text-xs font-bold text-danger">{error}</p> : null}
      {!hideHint && !compact ? (
        <p className="text-[11px] font-semibold text-ink-faint">
          Listeden bir adres seçin; yalnızca yazılan metin doğrulanmış konum sayılmaz.
        </p>
      ) : null}
    </div>
  );
}
