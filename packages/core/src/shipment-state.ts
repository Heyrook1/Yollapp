/**
 * Shipment status state machine — single source of truth.
 * DB status must only change via transition().
 */

export type ShipmentStatus =
  | "DRAFT"
  | "QUOTED"
  | "PAID"
  | "MATCHED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED_DELIVERY"
  | "RETURNED"
  | "CANCELLED";

export type TransitionEvent =
  | "QUOTE"
  | "PAY"
  | "MATCH"
  | "PICK_UP"
  | "START_TRANSIT"
  | "DELIVER"
  | "FAIL_DELIVERY"
  | "RETURN"
  | "CANCEL";

const ALLOWED: Record<ShipmentStatus, Partial<Record<TransitionEvent, ShipmentStatus>>> = {
  DRAFT: { QUOTE: "QUOTED", CANCEL: "CANCELLED" },
  QUOTED: { PAY: "PAID", QUOTE: "QUOTED", CANCEL: "CANCELLED" },
  PAID: { MATCH: "MATCHED", CANCEL: "CANCELLED" },
  MATCHED: { PICK_UP: "PICKED_UP", CANCEL: "CANCELLED" },
  PICKED_UP: { START_TRANSIT: "IN_TRANSIT", FAIL_DELIVERY: "FAILED_DELIVERY" },
  IN_TRANSIT: { DELIVER: "DELIVERED", FAIL_DELIVERY: "FAILED_DELIVERY" },
  DELIVERED: {},
  FAILED_DELIVERY: { RETURN: "RETURNED" },
  RETURNED: {},
  CANCELLED: {},
};

export class InvalidTransitionError extends Error {
  readonly code = "INVALID_TRANSITION";
  readonly from: ShipmentStatus;
  readonly event: TransitionEvent;

  constructor(from: ShipmentStatus, event: TransitionEvent) {
    super(`Invalid transition: ${from} + ${event}`);
    this.name = "InvalidTransitionError";
    this.from = from;
    this.event = event;
  }
}

export function canTransition(from: ShipmentStatus, event: TransitionEvent): boolean {
  return Boolean(ALLOWED[from][event]);
}

export function transition(
  from: ShipmentStatus,
  event: TransitionEvent,
): ShipmentStatus {
  const next = ALLOWED[from][event];
  if (!next) {
    throw new InvalidTransitionError(from, event);
  }
  return next;
}
