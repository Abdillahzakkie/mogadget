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
}

export async function bootstrap(): Promise<void> {
  assertSecureConfig();
  await connectMongoDB();
  await connectRedis();
  getLogger().info("mogadget core bootstrapped (mongo + redis)");
}
