import {
  type AuthenticatorTransportFuture,
  generateAuthenticationOptions,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { env } from "../../constants/environments";
import { stashChallenge } from "../../lib/webauthnChallenge";
import { listAllCredentialsDB } from "../../models/webauthnCredentials";

// Login is pre-session, so there is no user id to key the challenge by; the app has a single admin
// owner, so we offer every stored credential in `allowCredentials` and stash the challenge under a
// fixed "login" key. `userId` is accepted for API symmetry but currently unused.
export default async function authenticationOptions(_args?: {
  userId?: string;
}): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const credentials = await listAllCredentialsDB();
  const options = await generateAuthenticationOptions({
    rpID: env.rpId,
    userVerification: "preferred",
    allowCredentials: credentials.map((c) => ({
      id: c.credentialId,
      transports: c.transports as AuthenticatorTransportFuture[],
    })),
  });
  await stashChallenge("auth", "login", options.challenge);
  return options;
}
