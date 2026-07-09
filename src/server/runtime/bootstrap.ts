import { env, INSECURE_SESSION_SECRET } from "../constants/environments";
import { connectMongoDB } from "../databases/mongoDB";
import { connectRedis } from "../databases/redis";
import { getLogger } from "../lib/logger";

// Refuse to boot in production with the public dev secret: an attacker who knows the default
// SESSION_SECRET can forge a valid admin session. Fail loud and early rather than run insecurely.
function assertSecureConfig(): void {
  if (!env.isProduction) return;
  if (env.sessionSecret === INSECURE_SESSION_SECRET) {
    throw new Error(
      "Refusing to start in production with default SESSION_SECRET. " +
        "Set a strong, unique value before deploying.",
    );
  }
  // TOTP secrets are encrypted with a key derived from SESSION_SECRET when CREDENTIAL_ENCRYPTION_KEY
  // is unset. That works, but rotating SESSION_SECRET would then silently orphan every stored 2FA
  // secret. Warn loudly in production; enabling 2FA under a derived key is hard-blocked at the
  // service layer (see services/security).
  if (env.credentialKeyIsDerived) {
    getLogger().warn(
      "CREDENTIAL_ENCRYPTION_KEY is unset — TOTP secrets fall back to a key derived from " +
        "SESSION_SECRET. Set a dedicated key before enabling 2FA in production.",
    );
  }
}

export async function bootstrap(): Promise<void> {
  assertSecureConfig();
  await connectMongoDB();
  await connectRedis();
  getLogger().info("mogadget core bootstrapped (mongo + redis)");
}
