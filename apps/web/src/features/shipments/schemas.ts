import { z } from "zod";

/** Keep digits only; strip spaces/dashes for validation & storage. */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export const createShipmentSchema = z
  .object({
    zoneId: z.string().uuid(),
    sizeClassId: z.string().uuid(),
    isExpress: z.boolean().default(false),
    pickupAddress: z.string().trim().min(5).max(300),
    dropoffAddress: z.string().trim().min(5).max(300),
    recipientName: z.string().trim().min(2).max(120),
    recipientPhone: z
      .string()
      .trim()
      .transform(normalizePhone)
      .refine((digits) => digits.length >= 10 && digits.length <= 15, {
        message: "phone_invalid",
      }),
    notes: z.string().trim().max(500).optional(),
    windowStartsAt: z.string().datetime(),
    windowEndsAt: z.string().datetime(),
  })
  .refine((data) => new Date(data.windowEndsAt) > new Date(data.windowStartsAt), {
    message: "window_invalid",
    path: ["windowEndsAt"],
  });

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
