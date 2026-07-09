import { z } from "zod";

const preferencesSchema = z.object({
  timezone: z.string().trim().max(64).optional(),
  dateFormat: z.string().trim().max(32).optional(),
});

// PATCH /api/admin/profile — self-service profile fields. Username and password have their own
// dedicated flows (username is unique + audited; password requires the current one).
export const profilePatchSchema = z
  .object({
    displayName: z.string().trim().max(80),
    email: z.union([z.string().trim().email(), z.literal("")]),
    avatarKey: z.string().trim().max(256),
    preferences: preferencesSchema,
  })
  .partial();
export type TProfilePatch = z.infer<typeof profilePatchSchema>;

export const changeUsernameSchema = z.object({
  username: z.string().trim().min(1).max(64),
});
export type TChangeUsername = z.infer<typeof changeUsernameSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(8).max(256),
});
export type TChangePassword = z.infer<typeof changePasswordSchema>;
