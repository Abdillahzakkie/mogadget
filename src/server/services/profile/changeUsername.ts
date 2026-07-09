import {
  getUserByIdDB,
  getUserByUsernameDB,
  toUserProfileDto,
  updateUsernameDB,
} from "../../models/users";
import type { IUserProfileDto } from "../../models/users/types";

export type ChangeUsernameResult =
  | { ok: true; profile: IUserProfileDto }
  | { ok: false; reason: "not_found" | "taken" };

// Change the current admin's username. Guards uniqueness explicitly (before the DB write) so the
// UI can surface a clean "already taken" message rather than a raw duplicate-key failure.
export default async function changeUsername({
  userId,
  username,
}: {
  userId: string;
  username: string;
}): Promise<ChangeUsernameResult> {
  const me = await getUserByIdDB({ id: userId });
  if (!me) return { ok: false, reason: "not_found" };
  if (username !== me.username) {
    const existing = await getUserByUsernameDB({ username });
    if (existing && String(existing._id) !== userId) return { ok: false, reason: "taken" };
  }
  const updated = await updateUsernameDB({ id: userId, username });
  if (!updated) return { ok: false, reason: "taken" };
  return { ok: true, profile: toUserProfileDto(updated) };
}
