import { hashPassword } from "../../lib/password";
import {
  createUserDB,
  deleteUserDB,
  getUserByIdDB,
  getUserByUsernameDB,
  listUsersDB,
  toUserProfileDto,
  updateUserAccessDB,
  updateUserPasswordDB,
} from "../../models/users";
import type { IUserProfileDto } from "../../models/users/types";
import { listAdminUserIds } from "./guards";
import { invalidateEffectivePermissions } from "./resolveEffectivePermissions";

export async function listUsers(): Promise<IUserProfileDto[]> {
  return (await listUsersDB()).map(toUserProfileDto);
}

export type CreateUserResult =
  | { ok: true; user: IUserProfileDto }
  | { ok: false; reason: "taken" | "failed" };

export async function createUser(input: {
  username: string;
  password: string;
  groupIds: string[];
  attachedPolicyIds: string[];
}): Promise<CreateUserResult> {
  if (await getUserByUsernameDB({ username: input.username })) {
    return { ok: false, reason: "taken" };
  }
  const passwordHash = await hashPassword(input.password);
  const created = await createUserDB({
    username: input.username,
    passwordHash,
    groupIds: input.groupIds,
    attachedPolicyIds: input.attachedPolicyIds,
  });
  return created ? { ok: true, user: toUserProfileDto(created) } : { ok: false, reason: "failed" };
}

export type UpdateUserResult =
  | { ok: true; user: IUserProfileDto }
  | { ok: false; reason: "not_found" | "last_admin" };

// Update a user's group/policy assignment. If the change would strip the *last* administrator of
// iam:manage, it is reverted and rejected — the shop must never be left without an admin.
export async function updateUserAccess(input: {
  id: string;
  groupIds: string[];
  attachedPolicyIds: string[];
}): Promise<UpdateUserResult> {
  const before = await getUserByIdDB({ id: input.id });
  if (!before) return { ok: false, reason: "not_found" };

  const updated = await updateUserAccessDB({
    id: input.id,
    groupIds: input.groupIds,
    attachedPolicyIds: input.attachedPolicyIds,
  });
  if (!updated) return { ok: false, reason: "not_found" };
  await invalidateEffectivePermissions({ userId: input.id });

  const admins = await listAdminUserIds();
  if (admins.length === 0) {
    // Revert — this edit removed the final admin. `before` is a full IUser, so its id arrays
    // are always present (schema default []).
    await updateUserAccessDB({
      id: input.id,
      groupIds: before.groupIds.map(String),
      attachedPolicyIds: before.attachedPolicyIds.map(String),
    });
    await invalidateEffectivePermissions({ userId: input.id });
    return { ok: false, reason: "last_admin" };
  }
  return { ok: true, user: toUserProfileDto(updated) };
}

export type DeleteUserResult =
  | { ok: true }
  | { ok: false; reason: "self" | "last_admin" | "not_found" };

export async function deleteUser(input: {
  id: string;
  actingUserId: string;
}): Promise<DeleteUserResult> {
  if (input.id === input.actingUserId) return { ok: false, reason: "self" };
  const target = await getUserByIdDB({ id: input.id });
  if (!target) return { ok: false, reason: "not_found" };

  const admins = await listAdminUserIds();
  if (admins.includes(input.id) && admins.length <= 1) {
    return { ok: false, reason: "last_admin" };
  }
  const deleted = await deleteUserDB({ id: input.id });
  if (!deleted) return { ok: false, reason: "not_found" };
  await invalidateEffectivePermissions({ userId: input.id });
  return { ok: true };
}

export async function resetPassword(input: {
  id: string;
  newPassword: string;
}): Promise<{ ok: boolean }> {
  const passwordHash = await hashPassword(input.newPassword);
  return { ok: await updateUserPasswordDB({ id: input.id, passwordHash }) };
}
