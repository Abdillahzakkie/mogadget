import {
  type IWebauthnCredentialDto,
  listCredentialsByUserDB,
} from "../../models/webauthnCredentials";

// List a user's passkeys as safe DTOs — never leaks the public key or raw credential id.
export default async function listPasskeys({
  userId,
}: {
  userId: string;
}): Promise<IWebauthnCredentialDto[]> {
  const rows = await listCredentialsByUserDB({ userId });
  return rows.map((c) => ({
    id: String(c._id),
    nickname: c.nickname,
    createdAt: c.createdAt,
    lastUsedAt: c.lastUsedAt,
    deviceType: c.deviceType,
  }));
}
