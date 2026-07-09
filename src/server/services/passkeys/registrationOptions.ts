import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import {
  generateRegistrationOptions,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/server";
import { env } from "../../constants/environments";
import { stashChallenge } from "../../lib/webauthnChallenge";
import { listCredentialsByUserDB } from "../../models/webauthnCredentials";

// Build the options a browser passes to navigator.credentials.create(). We exclude the user's
// already-registered credentials so the same authenticator can't be enrolled twice, and stash the
// generated challenge (keyed by userId) so verifyRegistration can consume it exactly once.
export default async function registrationOptions({
  userId,
  username,
}: {
  userId: string;
  username: string;
}): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const existing = await listCredentialsByUserDB({ userId });
  const options = await generateRegistrationOptions({
    rpName: env.rpName,
    rpID: env.rpId,
    userName: username,
    userDisplayName: username,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: c.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });
  await stashChallenge("reg", userId, options.challenge);
  return options;
}
