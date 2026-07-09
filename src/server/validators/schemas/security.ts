import { z } from "zod";

// A 6-digit TOTP code or an `xxxxx-xxxxx` recovery code. Bounded so an attacker can't feed a huge
// body into verification.
export const totpCodeSchema = z.object({
  code: z.string().trim().min(6).max(20),
});
export type TTotpCode = z.infer<typeof totpCodeSchema>;
