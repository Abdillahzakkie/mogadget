import { toUserProfileDto, updateUserProfileDB } from "../../models/users";
import type { IUserProfileDto, IUserProfilePatch } from "../../models/users/types";

// Update self-service profile fields (display name, email metadata, avatar, preferences).
export default async function updateProfile({
  userId,
  patch,
}: {
  userId: string;
  patch: IUserProfilePatch;
}): Promise<IUserProfileDto | null> {
  const updated = await updateUserProfileDB({ id: userId, patch });
  return updated ? toUserProfileDto(updated) : null;
}
