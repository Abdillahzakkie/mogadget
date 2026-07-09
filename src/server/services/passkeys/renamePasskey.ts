import { type IWebauthnCredentialDto, renameCredentialDB } from "../../models/webauthnCredentials";

// Rename a passkey the user owns (the DB helper scopes by userId). Returns a safe DTO, or null when
// no matching credential exists for this user.
export default async function renamePasskey({
  id,
  userId,
  nickname,
}: {
  id: string;
  userId: string;
  nickname: string;
}): Promise<IWebauthnCredentialDto | null> {
  const updated = await renameCredentialDB({ id, userId, nickname });
  if (!updated) return null;
  return {
    id: String(updated._id),
    nickname: updated.nickname,
    createdAt: updated.createdAt,
    lastUsedAt: updated.lastUsedAt,
    deviceType: updated.deviceType,
  };
}
