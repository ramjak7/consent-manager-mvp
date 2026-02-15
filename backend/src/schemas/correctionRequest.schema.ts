import { z } from "zod";

// Helper function to sanitize strings (remove null bytes)
const sanitizeString = (s: string) => s.replace(/\0/g, "");

/**
 * Schema for creating a correction request (Data Principal).
 * DPDP §11 — Right to Correction
 */
export const CreateCorrectionRequestSchema = z
  .object({
    fieldName: z
      .string()
      .min(1, "fieldName is required")
      .max(100, "fieldName cannot exceed 100 characters")
      .transform(sanitizeString),
    currentValue: z
      .string()
      .max(1000, "currentValue cannot exceed 1000 characters")
      .transform(sanitizeString)
      .optional(),
    correctedValue: z
      .string()
      .min(1, "correctedValue is required")
      .max(1000, "correctedValue cannot exceed 1000 characters")
      .transform(sanitizeString),
    reason: z.enum(["INACCURATE", "INCOMPLETE", "OUTDATED", "MISLEADING"], {
      error:
        "reason must be one of: INACCURATE, INCOMPLETE, OUTDATED, MISLEADING",
    }),
    additionalNotes: z
      .string()
      .max(2000, "additionalNotes cannot exceed 2000 characters")
      .transform(sanitizeString)
      .optional(),
  })
  .strict();

/**
 * Schema for updating correction request status (Admin).
 */
export const UpdateCorrectionRequestStatusSchema = z
  .object({
    status: z.enum(["IN_PROGRESS", "APPROVED", "REJECTED", "COMPLETED"], {
      error:
        "status must be one of: IN_PROGRESS, APPROVED, REJECTED, COMPLETED",
    }),
    reviewNotes: z
      .string()
      .max(2000, "reviewNotes cannot exceed 2000 characters")
      .transform(sanitizeString)
      .optional(),
  })
  .strict();

/**
 * Query schema for listing correction requests (Admin).
 */
export const GetCorrectionRequestsQuerySchema = z.object({
  status: z
    .enum(["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED", "COMPLETED"])
    .optional(),
  page: z
    .string()
    .transform((s) => parseInt(s, 10))
    .pipe(z.number().int().positive())
    .optional(),
  limit: z
    .string()
    .transform((s) => parseInt(s, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
});

/**
 * UUID param validation
 */
export const CorrectionRequestUuidParamSchema = z.object({
  id: z.string().uuid("Invalid correction request ID"),
});
