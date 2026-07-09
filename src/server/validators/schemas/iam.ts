import { z } from "zod";

// A single policy/group statement. `actions` are validated for *shape* here; semantic validity
// (does the action name exist?) is enforced in the service via isValidPolicyStatement.
export const policyStatementSchema = z.object({
  effect: z.enum(["Allow", "Deny"]),
  actions: z.array(z.string().trim().min(1)).min(1),
});

const objectId = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{24}$/i, "invalid id");

export const createUserSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(8).max(256),
  groupIds: z.array(objectId).default([]),
  attachedPolicyIds: z.array(objectId).default([]),
});
export type TCreateUser = z.infer<typeof createUserSchema>;

export const updateUserAccessSchema = z.object({
  groupIds: z.array(objectId).default([]),
  attachedPolicyIds: z.array(objectId).default([]),
});
export type TUpdateUserAccess = z.infer<typeof updateUserAccessSchema>;

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(256),
});
export type TResetPassword = z.infer<typeof resetPasswordSchema>;

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  policyIds: z.array(objectId).default([]),
  statements: z.array(policyStatementSchema).default([]),
});
export type TCreateGroup = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    policyIds: z.array(objectId),
    statements: z.array(policyStatementSchema),
  })
  .partial();
export type TUpdateGroup = z.infer<typeof updateGroupSchema>;

export const createPolicySchema = z.object({
  name: z.string().trim().min(1).max(80),
  statements: z.array(policyStatementSchema).default([]),
});
export type TCreatePolicy = z.infer<typeof createPolicySchema>;

export const updatePolicySchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    statements: z.array(policyStatementSchema),
  })
  .partial();
export type TUpdatePolicy = z.infer<typeof updatePolicySchema>;
