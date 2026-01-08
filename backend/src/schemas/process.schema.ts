import { z } from "zod";

export const ProcessRequestSchema = z.object({
  userId: z.string().min(1),
  purpose: z.string().min(1),
  dataTypes: z
    .array(z.string().min(1))
    .min(1),
}).strict(); // 🔒 Reject extra fields

export type ProcessRequest = z.infer<typeof ProcessRequestSchema>;