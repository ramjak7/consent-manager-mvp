import { z } from "zod";

export const CreateErasureRequestSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
  additionalNotes: z.string().optional(),
});

export const UpdateErasureRequestStatusSchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETED", "REJECTED"]),
  reviewNotes: z.string().optional(),
});

export const GetErasureRequestsQuerySchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const UuidParamSchema = z.object({
  id: z.string().uuid("Invalid request ID"),
});

export type CreateErasureRequestInput = z.infer<typeof CreateErasureRequestSchema>;
export type UpdateErasureRequestStatusInput = z.infer<typeof UpdateErasureRequestStatusSchema>;
export type GetErasureRequestsQuery = z.infer<typeof GetErasureRequestsQuerySchema>;
