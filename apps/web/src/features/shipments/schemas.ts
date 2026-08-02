import { z } from "zod";

/** Keep digits only; strip spaces/dashes for validation & storage. */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

const optionalCoord = z.number().min(-90).max(90).optional();
const optionalLng = z.number().min(-180).max(180).optional();

export const createShipmentSchema = z
  .object({
    zoneId: z.string().uuid(),
    sizeClassId: z.string().uuid(),
    isExpress: z.boolean().default(false),
    isTaxiCargo: z.boolean().default(false),
    pickupAddress: z.string().trim().min(5).max(300),
    dropoffAddress: z.string().trim().min(5).max(300),
    pickupPlaceId: z.string().trim().max(256).optional(),
    dropoffPlaceId: z.string().trim().max(256).optional(),
    pickupLat: optionalCoord,
    pickupLng: optionalLng,
    dropoffLat: optionalCoord,
    dropoffLng: optionalLng,
    pickupEntranceNote: z.string().trim().max(200).optional(),
    dropoffEntranceNote: z.string().trim().max(200).optional(),
    recipientName: z.string().trim().min(2).max(120),
    recipientPhone: z
      .string()
      .trim()
      .transform(normalizePhone)
      .refine((digits) => digits.length >= 10 && digits.length <= 15, {
        message: "phone_invalid",
      }),
    notes: z.string().trim().max(500).optional(),
    itemDescription: z.string().trim().min(2).max(120).optional(),
    itemColor: z.string().trim().max(40).optional(),
    windowStartsAt: z.string().datetime(),
    windowEndsAt: z.string().datetime(),
    /** Server-computed route snapshot (client may preview; server revalidates). */
    routeDistanceMeters: z.number().int().positive().optional(),
    routeDurationSeconds: z.number().int().positive().optional(),
    routePolyline: z.string().max(50_000).optional(),
  })
  .refine((data) => new Date(data.windowEndsAt) > new Date(data.windowStartsAt), {
    message: "window_invalid",
    path: ["windowEndsAt"],
  })
  .refine(
    (data) =>
      (data.pickupLat === undefined && data.pickupLng === undefined) ||
      (data.pickupLat !== undefined && data.pickupLng !== undefined),
    { message: "pickup_coords_incomplete", path: ["pickupLat"] },
  )
  .refine(
    (data) =>
      (data.dropoffLat === undefined && data.dropoffLng === undefined) ||
      (data.dropoffLat !== undefined && data.dropoffLng !== undefined),
    { message: "dropoff_coords_incomplete", path: ["dropoffLat"] },
  );

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const quoteShipmentSchema = z.object({
  shipmentId: z.string().uuid(),
});

export type QuoteShipmentInput = z.infer<typeof quoteShipmentSchema>;

export const markPaidSchema = z.object({
  shipmentId: z.string().uuid(),
});

export type MarkPaidInput = z.infer<typeof markPaidSchema>;

export const acceptJobSchema = z.object({
  shipmentId: z.string().uuid(),
});

export type AcceptJobInput = z.infer<typeof acceptJobSchema>;

export const courierProgressSchema = z.object({
  shipmentId: z.string().uuid(),
  event: z.enum(["PICK_UP", "START_TRANSIT", "DELIVER", "FAIL_DELIVERY"]),
  /** DELIVER için 6 haneli teslim kodu (delivery_proof açıkken zorunlu). */
  deliveryCode: z.string().trim().max(12).optional(),
});

export type CourierProgressInput = z.infer<typeof courierProgressSchema>;

export const cancelShipmentSchema = z.object({
  shipmentId: z.string().uuid(),
});

export type CancelShipmentInput = z.infer<typeof cancelShipmentSchema>;
