import { type RegistrationResponseJSON, verifyRegistrationResponse } from "@simplewebauthn/server";
import { env } from "../../constants/environments";
import { consumeChallenge } from "../../lib/webauthnChallenge";
import { createCredentialDB } from "../../models/webauthnCredentials";

// Verify a registration ceremony and, on success, persist the new credential. The challenge is
// consumed (single-use) up front; if it is missing/expired verification cannot proceed. On the v13
// response shape the stored public key lives under `registrationInfo.credential`.
export default async function verifyRegistration({
  userId,
  response,
  nickname,
}: {
  userId: string;
  response: RegistrationResponseJSON;
  nickname?: string;
}): Promise<{ verified: boolean }> {
  const expectedChallenge = await consumeChallenge("reg", userId);
  if (!expectedChallenge) return { verified: false };

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: env.webauthnOrigin,
    expectedRPID: env.rpId,
  });

  if (!verification.verified || !verification.registrationInfo) return { verified: false };

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const created = await createCredentialDB({
    userId,
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    transports: credential.transports ?? [],
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    nickname: nickname?.trim() || "Passkey",
  });

  return { verified: Boolean(created) };
}
