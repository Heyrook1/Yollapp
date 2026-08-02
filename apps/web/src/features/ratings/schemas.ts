import { z } from "zod";

export const submitRatingSchema = z.object({
  shipmentId: z.string().uuid(),
  stars: z.number().int().min(1).max(5),
  tags: z.array(z.string().trim().max(40)).max(5).default([]),
  comment: z.string().trim().max(400).optional(),
});

export type SubmitRatingInput = z.infer<typeof submitRatingSchema>;
