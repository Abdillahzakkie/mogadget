import { z } from "zod";

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});
export type TAdminLoginInput = z.infer<typeof adminLoginSchema>;
