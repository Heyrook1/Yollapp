import { z } from "zod";

export const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const autocompleteSchema = z.object({
  query: z.string().trim().min(2).max(120),
  sessionToken: z.string().uuid(),
  locationBias: latLngSchema.optional(),
});

export const placeDetailsSchema = z.object({
  placeId: z.string().trim().min(3).max(256),
  sessionToken: z.string().uuid(),
});

export const computeRouteSchema = z.object({
  origin: latLngSchema,
  destination: latLngSchema,
});

export const reverseGeocodeSchema = latLngSchema;

export type ReverseGeocodeInput = z.infer<typeof reverseGeocodeSchema>;

export const locationUpdateSchema = z.object({
  jobId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).max(5000).nullable().optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
  speedMetersPerSecond: z.number().min(0).max(80).nullable().optional(),
  deviceTimestamp: z.string().datetime().optional(),
  sequenceNumber: z.number().int().min(0).max(2_000_000_000),
});

export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;

export const courierActivitySchema = z.enum(["AVAILABLE", "ON_JOB", "BUSY"]);

export const vehicleTypeSchema = z.enum([
  "WALK",
  "BIKE",
  "MOTORCYCLE",
  "CAR",
  "TAXI",
]);

/** Kurye varlık güncellemesi — toggle ve/veya konum. */
export const presenceUpdateSchema = z
  .object({
    sharingEnabled: z.boolean().optional(),
    forceBusy: z.boolean().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    accuracyMeters: z.number().min(0).max(5000).nullable().optional(),
    heading: z.number().min(0).max(360).nullable().optional(),
    sequenceNumber: z.number().int().min(0).max(2_000_000_000).optional(),
  })
  .superRefine((val, ctx) => {
    const hasLat = val.latitude !== undefined;
    const hasLng = val.longitude !== undefined;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "latitude ve longitude birlikte gönderilmeli.",
      });
    }
    if (
      val.sharingEnabled === undefined &&
      val.forceBusy === undefined &&
      !hasLat
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "En az bir alan gerekli.",
      });
    }
  });

export type PresenceUpdateInput = z.infer<typeof presenceUpdateSchema>;

const csvEnum = <T extends z.ZodTypeAny>(item: T) =>
  z
    .string()
    .optional()
    .transform((raw, ctx) => {
      if (!raw || raw.trim() === "") return undefined;
      const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
      const out: z.infer<T>[] = [];
      for (const p of parts) {
        const parsed = item.safeParse(p);
        if (!parsed.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Geçersiz değer: ${p}`,
          });
          return z.NEVER;
        }
        out.push(parsed.data);
      }
      return out;
    });

export const nearbyCouriersQuerySchema = z.object({
  south: z.coerce.number().min(-90).max(90),
  west: z.coerce.number().min(-180).max(180),
  north: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
  activity: csvEnum(courierActivitySchema),
  vehicleType: csvEnum(vehicleTypeSchema),
});

export type NearbyCouriersQuery = z.infer<typeof nearbyCouriersQuerySchema>;
