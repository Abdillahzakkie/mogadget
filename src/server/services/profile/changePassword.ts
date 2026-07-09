import { hashPassword, verifyPassword } from "../../lib/password";
import { getUserByIdDB, updateUserPasswordDB } from "../../models/users";

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "wrong_current" | "same_password" };

// Change the current admin's password. Requires the current password (defence against an
// unlocked session), rejects a no-op change, and re-hashes with bcrypt.
export default async function changePassword({
  userId,
  currentPassword,
  newPassword,
}: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<ChangePasswordResult> {
  const user = await getUserByIdDB({ id: userId });
  if (!user) return { ok: false, reason: "not_found" };
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    return { ok: false, reason: "wrong_current" };
  }
  if (await verifyPassword(user.passwordHash, newPassword)) {
    return { ok: false, reason: "same_password" };
  }
  const passwordHash = await hashPassword(newPassword);
  const saved = await updateUserPasswordDB({ id: userId, passwordHash });
  return saved ? { ok: true } : { ok: false, reason: "not_found" };
}
