import {
  type AuthenticatorTransportFuture,
  generateAuthenticationOptions,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { env } from "../../constants/environments";
import { stashChallenge } from "../../lib/webauthnChallenge";
import { listAllCredentialsDB, listCredentialsByUserDB } from "../../models/webauthnCredentials";

// WebAuthn request options for an authentication ceremony.
//   • Passwordless login (no userId): the app has a single admin owner, so we offer every stored
//     credential and stash the challenge under a fixed "login" key.
//   • Second factor after password (userId given): offer only that user's credentials and key the
//     challenge by the user id, so the ceremony is bound to the password-authenticated account.
export default async function authenticationOptions(args?: {
  userId?: string;
}): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const userId = args?.userId;
  const credentials = userId
    ? await listCredentialsByUserDB({ userId })
    : await listAllCredentialsDB();
  const options = await generateAuthenticationOptions({
    rpID: env.rpId,
    userVerification: "preferred",
    allowCredentials: credentials.map((c) => ({
      id: c.credentialId,
      transports: c.transports as AuthenticatorTransportFuture[],
    })),
  });
  await stashChallenge("auth", userId ?? "login", options.challenge);
  return options;
}
