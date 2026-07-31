"use client";

import { useState, useTransition } from "react";
import { reviewCourierAction } from "../actions";
import { messages } from "../messages";
import type { CourierProfileRecord } from "../service";

type Props = {
  profiles: CourierProfileRecord[];
};

export function PendingList({ profiles }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (profiles.length === 0) {
    return <p className="text-ink-secondary">{messages.adminEmpty}</p>;
  }

  function review(profileId: string, decision: "APPROVE" | "REJECT") {
    setFeedback(null);
    setPendingId(profileId);
    startTransition(async () => {
      const result = await reviewCourierAction({
        profileId,
        decision,
        rejectionReason: decision === "REJECT" ? reasons[profileId] : undefined,
      });
      setFeedback(result.message);
      setPendingId(null);
    });
  }

  return (
    <div className="space-y-4">
      {feedback ? <p className="text-sm text-ink">{feedback}</p> : null}
      <ul className="space-y-4">
        {profiles.map((profile) => {
          const busy = isPending && pendingId === profile.id;
          return (
            <li
              key={profile.id}
              className="rounded-md border border-border bg-white p-4 space-y-3"
            >
              <div className="text-sm text-ink">
                <p>
                  <span className="font-medium">Profil:</span> {profile.id}
                </p>
                <p>
                  <span className="font-medium">AraÃ§:</span>{" "}
                  {messages.vehicle[profile.vehicleType]}
                </p>
                <p>
                  <span className="font-medium">BÃ¶lgeler:</span>{" "}
                  {profile.activeZones.join(", ")}
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm text-ink">
                  {messages.rejectionReasonLabel}
                  <input
                    className="mt-1 w-full rounded-md border border-border px-3 py-2"
                    value={reasons[profile.id] ?? ""}
                    disabled={busy}
                    onChange={(e) =>
                      setReasons((prev) => ({ ...prev, [profile.id]: e.target.value }))
                    }
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => review(profile.id, "APPROVE")}
                    className="rounded-md bg-yolla-blue px-3 py-2 text-sm text-white hover:bg-yolla-blue-dark disabled:opacity-60"
                  >
                    {messages.approve}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => review(profile.id, "REJECT")}
                    className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-800 hover:bg-red-50 disabled:opacity-60"
                  >
                    {messages.reject}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
