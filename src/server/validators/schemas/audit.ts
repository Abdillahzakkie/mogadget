import { z } from "zod";

export const auditQuerySchema = z.object({
  action: z.string().trim().min(1).optional(),
  userId: z.string().trim().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
export type TAuditQuery = z.infer<typeof auditQuerySchema>;
