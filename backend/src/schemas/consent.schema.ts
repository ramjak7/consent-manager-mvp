import { z } from "zod";

// Helper function to sanitize strings (remove null bytes)
const sanitizeString = (s: string) => s.replace(/\0/g, '');

export const CreateConsentSchema = z.object({
  // P1-2: userId is now optional — server derives from JWT token
  // Kept for backward compatibility with service-to-service calls
  userId: z.string()
    .min(1, "userId cannot be empty")
    .max(500, "userId cannot exceed 500 characters")
    .transform(sanitizeString)
    .refine((s) => !/\0/.test(s), { message: "userId contains invalid characters" })
    .optional(),
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
  // Notice binding fields (DPDP compliance)
  noticeId: z.string()
    .min(1, "noticeId is required for informed consent")
    .describe("Identifier of the consent notice shown to data principal"),
  noticeVersion: z.string()
    .min(1, "noticeVersion is required")
    .describe("Version of the consent notice shown"),
  language: z.string()
    .min(2, "language must be a valid language code")
    .max(10, "language code too long")
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Invalid language code format (e.g., 'en', 'hi', 'en-IN')")
    .describe("Language code of the notice shown (ISO 639-1)"),
}).strict();

export const RevokeSemanticSchema = z.object({
  // P1-2: userId now optional — server derives from JWT token
  userId: z.string()
    .min(1, "userId cannot be empty")
    .transform(sanitizeString)
    .optional(),
  purpose: z.string()
    .min(1, "purpose cannot be empty")
    .transform(sanitizeString),
}).strict();

export type CreateConsent = z.infer<typeof CreateConsentSchema>;
