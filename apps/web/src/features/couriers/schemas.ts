import { z } from "zod";

export const vehicleTypeSchema = z.enum(["WALK", "BIKE", "MOTORCYCLE", "CAR"]);

export const applyCourierSchema = z.object({
  vehicleType: vehicleTypeSchema,
  activeZones: z
    .array(z.string().trim().min(1).max(80))
    .min(1, "En az bir bölge gerekli")
    .max(20),
  documentPaths: z.array(z.string().min(1).max(500)).max(10).default([]),
});

export type ApplyCourierInput = z.infer<typeof applyCourierSchema>;

export const reviewCourierSchema = z.object({
  profileId: z.string().uuid(),
  decision: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().trim().min(3).max(500).optional(),
});

export type ReviewCourierInput = z.infer<typeof reviewCourierSchema>;
