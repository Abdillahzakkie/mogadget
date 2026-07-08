import { z } from "zod";

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  // Bounded so an unauthenticated caller can't feed megabytes into argon2 verification.
  password: z.string().min(1).max(256),
});
export type TAdminLoginInput = z.infer<typeof adminLoginSchema>;
