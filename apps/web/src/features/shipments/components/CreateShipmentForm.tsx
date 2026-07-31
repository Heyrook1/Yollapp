"use client";

import { useMemo, useState, useTransition } from "react";
import { createShipmentAction } from "../actions";
import { messages } from "../messages";

type ZoneOption = { id: string; name: string; baseFeeMinor: number };
type SizeOption = { id: string; name: string; code: string };

type Props = {
  zones: ZoneOption[];
  sizeClasses: SizeOption[];
};

function defaultWindow() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 2);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  return {
    windowStartsAt: start.toISOString().slice(0, 16),
    windowEndsAt: end.toISOString().slice(0, 16),
  };
}

export function CreateShipmentForm({ zones, sizeClasses }: Props) {
  const defaults = useMemo(() => defaultWindow(), []);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [sizeClassId, setSizeClassId] = useState(sizeClasses[0]?.id ?? "");
  const [isExpress, setIsExpress] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [windowStartsAt, setWindowStartsAt] = useState(defaults.windowStartsAt);
  const [windowEndsAt, setWindowEndsAt] = useState(defaults.windowEndsAt);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const disabled = pending || zones.length === 0 || sizeClasses.length === 0;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await createShipmentAction({
        zoneId,
        sizeClassId,
        isExpress,
        pickupAddress,
        dropoffAddress,
        recipientName,
        recipientPhone,
        notes: notes || undefined,
        windowStartsAt: new Date(windowStartsAt).toISOString(),
        windowEndsAt: new Date(windowEndsAt).toISOString(),
      });
      if (result.ok) {
        setMessage(
          result.amountLabel
            ? `${result.message} (${result.amountLabel})`
            : result.message,
        );
      } else {
        setError(result.message);
      }
    });
  }

  if (zones.length === 0 || sizeClasses.length === 0) {
    return (
      <p className="text-brand-700">
        Bölge/boyut kataloğu boş. `pnpm db:seed` çalıştırın.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <div className="space-y-1">
        <label htmlFor="zone" className="block text-sm font-medium">
          {messages.zoneLabel}
        </label>
        <select
          id="zone"
          className="w-full rounded-md border border-brand-200 bg-white px-3 py-2"
          value={zoneId}
          disabled={disabled}
          onChange={(e) => setZoneId(e.target.value)}
        >
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="size" className="block text-sm font-medium">
          {messages.sizeLabel}
        </label>
        <select
          id="size"
          className="w-full rounded-md border border-brand-200 bg-white px-3 py-2"
          value={sizeClassId}
          disabled={disabled}
          onChange={(e) => setSizeClassId(e.target.value)}
        >
          {sizeClasses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isExpress}
          disabled={disabled}
          onChange={(e) => setIsExpress(e.target.checked)}
        />
        {messages.expressLabel}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="wstart" className="block text-sm font-medium">
            {messages.windowStartLabel}
          </label>
          <input
            id="wstart"
            type="datetime-local"
            required
            className="w-full rounded-md border border-brand-200 bg-white px-3 py-2"
            value={windowStartsAt}
            disabled={disabled}
            onChange={(e) => setWindowStartsAt(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="wend" className="block text-sm font-medium">
            {messages.windowEndLabel}
          </label>
          <input
            id="wend"
            type="datetime-local"
            required
            className="w-full rounded-md border border-brand-200 bg-white px-3 py-2"
            value={windowEndsAt}
            disabled={disabled}
            onChange={(e) => setWindowEndsAt(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="pickup" className="block text-sm font-medium">
          {messages.pickupLabel}
        </label>
        <input
          id="pickup"
          required
          className="w-full rounded-md border border-brand-200 bg-white px-3 py-2"
          value={pickupAddress}
          disabled={disabled}
          onChange={(e) => setPickupAddress(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="dropoff" className="block text-sm font-medium">
          {messages.dropoffLabel}
        </label>
        <input
          id="dropoff"
          required
          className="w-full rounded-md border border-brand-200 bg-white px-3 py-2"
          value={dropoffAddress}
          disabled={disabled}
          onChange={(e) => setDropoffAddress(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="rname" className="block text-sm font-medium">
            {messages.recipientNameLabel}
          </label>
          <input
            id="rname"
            required
            className="w-full rounded-md border border-brand-200 bg-white px-3 py-2"
            value={recipientName}
            disabled={disabled}
            onChange={(e) => setRecipientName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="rphone" className="block text-sm font-medium">
            {messages.recipientPhoneLabel}
          </label>
          <input
            id="rphone"
            required
            className="w-full rounded-md border border-brand-200 bg-white px-3 py-2"
            value={recipientPhone}
            disabled={disabled}
            onChange={(e) => setRecipientPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="notes" className="block text-sm font-medium">
          {messages.notesLabel}
        </label>
        <textarea
          id="notes"
          className="w-full rounded-md border border-brand-200 bg-white px-3 py-2"
          rows={2}
          value={notes}
          disabled={disabled}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Hesaplanıyor…" : messages.createSubmit}
      </button>

      {message ? <p className="text-sm text-brand-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
