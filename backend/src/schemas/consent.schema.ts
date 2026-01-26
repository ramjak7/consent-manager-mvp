import { z } from "zod";

// Helper function to sanitize strings (remove null bytes)
const sanitizeString = (s: string) => s.replace(/\0/g, '');

export const CreateConsentSchema = z.object({
  userId: z.string()
    .min(1, "userId cannot be empty")
    .max(500, "userId cannot exceed 500 characters")
    .transform(sanitizeString)
    .refine((s) => !/\0/.test(s), { message: "userId contains invalid characters" }),
  purpose: z.string()
    .min(1, "purpose cannot be empty")
    .transform(sanitizeString)
    .refine((s) => !/\0/.test(s), { message: "purpose contains invalid characters" }),
  dataTypes: z.array(z.string().min(1)).min(1),
  validUntil: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), {
      message: "Invalid ISO timestamp",
    })
    .refine((s) => new Date(s) > new Date(), {
      message: "validUntil must be a future date",
    }),
}).strict();

export const RevokeSemanticSchema = z.object({
  userId: z.string()
    .min(1, "userId cannot be empty")
    .transform(sanitizeString),
  purpose: z.string()
    .min(1, "purpose cannot be empty")
    .transform(sanitizeString),
}).strict();

export type CreateConsent = z.infer<typeof CreateConsentSchema>;
