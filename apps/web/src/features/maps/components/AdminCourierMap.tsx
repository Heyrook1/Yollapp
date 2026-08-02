"use client";

import { useCallback, useState } from "react";
import { GoogleRouteMap, type PresenceMarker } from "./GoogleRouteMap";
import {
  CourierPresenceLayer,
  DEFAULT_PRESENCE_FILTERS,
  type PresenceFilters,
} from "./CourierPresenceLayer";

/**
 * Admin operasyon — canlı kurye varlık haritası (gönderici ile aynı nearby API).
 */
export function AdminCourierMap() {
  const [markers, setMarkers] = useState<PresenceMarker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PresenceFilters>({
    ...DEFAULT_PRESENCE_FILTERS,
    activities: ["AVAILABLE", "ON_JOB", "BUSY"],
  });

  const onMarkers = useCallback((m: PresenceMarker[]) => setMarkers(m), []);

  function toggleActivity(activity: PresenceFilters["activities"][number]) {
    setFilters((prev) => {
      const has = prev.activities.includes(activity);
      return {
        ...prev,
        activities: has
          ? prev.activities.filter((a) => a !== activity)
          : [...prev.activities, activity],
      };
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["AVAILABLE", "Müsait"],
            ["ON_JOB", "Teslimatta"],
            ["BUSY", "Meşgul"],
          ] as const
        ).map(([key, label]) => {
          const active = filters.activities.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => toggleActivity(key)}
              className={`min-h-10 rounded-full px-4 text-xs font-extrabold ${
                active
                  ? "bg-navy text-ink-inverse"
                  : "bg-fill text-ink-secondary"
              }`}
            >
              {label}
            </button>
          );
        })}
        <span className="self-center text-xs font-bold text-ink-faint">
          {markers.length} canlı
        </span>
      </div>
      {error ? (
        <p className="rounded-2xl bg-danger-soft px-3 py-2 text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}
      <GoogleRouteMap
        className="h-[480px] w-full"
        showControls
        controlsLayout="fab"
        presenceMarkers={markers}
      />
      <CourierPresenceLayer
        filters={filters}
        onMarkers={onMarkers}
        onError={setError}
      />
      <p className="text-xs font-semibold text-ink-faint">
        Yeşil = müsait, turuncu = teslimatta, gri = meşgul. İsim/telefon yok.
      </p>
    </div>
  );
}
