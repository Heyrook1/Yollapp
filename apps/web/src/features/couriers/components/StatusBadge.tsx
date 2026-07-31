import { CourierStatus } from "@yolla/db";
import { messages } from "../messages";
import type { CourierProfileRecord } from "../service";

const labelByStatus: Record<CourierStatus, string> = {
  PENDING: messages.statusPending,
  UNDER_REVIEW: messages.statusUnderReview,
  APPROVED: messages.statusApproved,
  REJECTED: messages.statusRejected,
  SUSPENDED: messages.statusSuspended,
  DISABLED: messages.statusDisabled,
};

const classByStatus: Record<CourierStatus, string> = {
  PENDING: "bg-warning-soft text-warning-deep",
  UNDER_REVIEW: "bg-info-soft text-info",
  APPROVED: "bg-success-soft text-success-deep",
  REJECTED: "bg-danger-soft text-danger",
  SUSPENDED: "bg-danger-soft text-danger",
  DISABLED: "bg-fill text-ink-secondary",
};

export function StatusBadge({ profile }: { profile: CourierProfileRecord }) {
  const blocked =
    profile.status === CourierStatus.REJECTED ||
    profile.status === CourierStatus.SUSPENDED;

  return (
    <div className="space-y-2">
      <span
        className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-extrabold ${classByStatus[profile.status]}`}
      >
        {labelByStatus[profile.status]}
      </span>
      {blocked && profile.rejectionReason ? (
        <p className="text-sm font-semibold text-danger">{profile.rejectionReason}</p>
      ) : null}
    </div>
  );
}
