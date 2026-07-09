import { deleteCredentialDB } from "../../models/webauthnCredentials";

// Delete a passkey the user owns (the DB helper scopes by userId). Returns false when no matching
// credential exists for this user.
export default async function deletePasskey({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<boolean> {
  return deleteCredentialDB({ id, userId });
}
