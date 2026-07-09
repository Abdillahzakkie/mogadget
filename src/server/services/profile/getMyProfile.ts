import { getUserByIdDB, toUserProfileDto } from "../../models/users";
import type { IUserProfileDto } from "../../models/users/types";

// The current admin's own profile as a client-safe DTO (no passwordHash).
export default async function getMyProfile({
  userId,
}: {
  userId: string;
}): Promise<IUserProfileDto | null> {
  const user = await getUserByIdDB({ id: userId });
  return user ? toUserProfileDto(user) : null;
}
