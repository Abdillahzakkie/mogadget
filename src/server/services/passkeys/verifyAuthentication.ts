import {
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { env } from "../../constants/environments";
import { consumeChallenge } from "../../lib/webauthnChallenge";
import {
  getCredentialByCredentialIdDB,
  updateCredentialCounterDB,
} from "../../models/webauthnCredentials";

// Verify a login ceremony. We look up the stored credential the browser asserted (`response.id`),
// consume the single-use "login" challenge, then let the library check the signature against the
// stored public key/counter. On success we advance the stored counter (anti-replay) and return the
// owning user's id so the caller can mint a session.
export default async function verifyAuthentication({
  response,
}: {
  response: AuthenticationResponseJSON;
}): Promise<{ verified: boolean; userId?: string }> {
  const stored = await getCredentialByCredentialIdDB({ credentialId: response.id });
  if (!stored) return { verified: false };

  const expectedChallenge = await consumeChallenge("auth", "login");
  if (!expectedChallenge) return { verified: false };

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: env.webauthnOrigin,
    expectedRPID: env.rpId,
    credential: {
      id: stored.credentialId,
      publicKey: Buffer.from(stored.publicKey, "base64url"),
      counter: stored.counter,
      transports: stored.transports as AuthenticatorTransportFuture[],
    },
  });

  if (!verification.verified) return { verified: false };

  await updateCredentialCounterDB({
    credentialId: stored.credentialId,
    counter: verification.authenticationInfo.newCounter,
    lastUsedAt: new Date(),
  });

  return { verified: true, userId: stored.userId };
}
