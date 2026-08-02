"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CourierPresenceSharer } from "./CourierPresenceSharer";

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

/**
 * Kurye paneli — “Çevrimiçiyim / İş arıyorum” opt-in.
 * Kapalıyken gönderici haritasında görünmez.
 */
export function CourierOnlineToggle() {
  const [enabled, setEnabled] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch("/api/v1/driver/presence", { headers });
        if (!res.ok) return;
        const json = (await res.json()) as {
          presence?: { sharingEnabled?: boolean };
        };
        if (json.presence?.sharingEnabled) {
          setEnabled(true);
        }
      } catch {
        /* sessiz */
      }
    })();
  }, []);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setLoadError(null);
    const next = !enabled;
    if (!next) {
      setEnabled(false);
      setSharing(false);
      try {
        const headers = await authHeaders();
        await fetch("/api/v1/driver/presence", {
          method: "POST",
          headers,
          body: JSON.stringify({ sharingEnabled: false }),
        });
      } catch {
        setLoadError("Çevrimdışı yapılamadı.");
      }
      setBusy(false);
      return;
    }
    setEnabled(true);
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={busy}
        onClick={() => void toggle()}
        className="flex items-center gap-2 rounded-full bg-navy py-2 pl-4 pr-2.5 text-sm font-extrabold text-[#4ADE80] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        {enabled ? (sharing ? "Çevrimiçisin" : "Konum…") : "Çevrimdışı"}
        <span
          className={`relative inline-block h-7 w-11 rounded-full transition ${
            enabled ? "bg-success" : "bg-border"
          }`}
          aria-hidden
        >
          <span
            className={`absolute top-0.5 size-6 rounded-full bg-white transition ${
              enabled ? "right-0.5" : "left-0.5"
            }`}
          />
        </span>
      </button>
      {loadError ? <p className="text-xs font-bold text-danger">{loadError}</p> : null}
      <CourierPresenceSharer enabled={enabled} onStatusChange={setSharing} />
    </div>
  );
}
