"use client";

import { useState, useTransition } from "react";
import { applyCourierAction } from "../actions";
import { messages } from "../messages";
import type { vehicleTypeSchema } from "../schemas";
import type { z } from "zod";

type VehicleType = z.infer<typeof vehicleTypeSchema>;

const vehicles: VehicleType[] = ["WALK", "BIKE", "MOTORCYCLE", "CAR"];

type Props = {
  disabled?: boolean;
};

export function ApplyForm({ disabled = false }: Props) {
  const [vehicleType, setVehicleType] = useState<VehicleType>("MOTORCYCLE");
  const [zones, setZones] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const activeZones = zones
      .split(",")
      .map((z) => z.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await applyCourierAction({
        vehicleType,
        activeZones,
        documentPaths: [],
      });
      if (result.ok) {
        setMessage(result.message);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="vehicle" className="block text-sm font-medium text-ink">
          {messages.vehicleLabel}
        </label>
        <select
          id="vehicle"
          className="w-full rounded-md border border-border bg-white px-3 py-2"
          value={vehicleType}
          disabled={disabled || pending}
          onChange={(e) => setVehicleType(e.target.value as VehicleType)}
        >
          {vehicles.map((v) => (
            <option key={v} value={v}>
              {messages.vehicle[v]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="zones" className="block text-sm font-medium text-ink">
          {messages.zonesLabel}
        </label>
        <input
          id="zones"
          className="w-full rounded-md border border-border bg-white px-3 py-2"
          placeholder="LefkoÅŸa, Girne"
          value={zones}
          disabled={disabled || pending}
          onChange={(e) => setZones(e.target.value)}
          required
        />
      </div>

      <button
        type="submit"
        disabled={disabled || pending}
        className="rounded-md bg-yolla-blue px-4 py-2 text-white hover:bg-yolla-blue-dark disabled:opacity-60"
      >
        {pending ? "GÃ¶nderiliyorâ€¦" : messages.submitApply}
      </button>

      {message ? <p className="text-sm text-ink-secondary">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
