import { CourierStatus } from "@yolla/db";
import { messages } from "../messages";
import type { CourierProfileRecord } from "../service";

const labelByStatus: Record<CourierStatus, string> = {
  PENDING: messages.statusPending,
  APPROVED: messages.statusApproved,
  REJECTED: messages.statusRejected,
};

const classByStatus: Record<CourierStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  APPROVED: "bg-brand-100 text-brand-900",
  REJECTED: "bg-red-100 text-red-900",
};

export function StatusBadge({ profile }: { profile: CourierProfileRecord }) {
  return (
    <div className="space-y-2">
      <span
        className={`inline-block rounded-md px-2 py-1 text-sm font-medium ${classByStatus[profile.status]}`}
      >
        {labelByStatus[profile.status]}
      </span>
      {profile.status === CourierStatus.REJECTED && profile.rejectionReason ? (
        <p className="text-sm text-red-800">{profile.rejectionReason}</p>
      ) : null}
    </div>
  );
}
