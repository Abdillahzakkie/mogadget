import { connectMongoDB } from "../databases/mongoDB";
import { connectRedis } from "../databases/redis";
import { getLogger } from "../lib/logger";
import {
  env,
  INSECURE_SESSION_SECRET,
  INSECURE_REVALIDATE_SECRET,
} from "../constants/environments";

// Refuse to boot in production with the public dev secrets: an attacker who knows the default
// SESSION_SECRET can forge a valid admin session. Fail loud and early rather than run insecurely.
function assertSecureConfig(): void {
  if (!env.isProduction) return;
  const insecure: string[] = [];
  if (env.sessionSecret === INSECURE_SESSION_SECRET) insecure.push("SESSION_SECRET");
  if (env.revalidateSecret === INSECURE_REVALIDATE_SECRET) insecure.push("REVALIDATE_SECRET");
  if (insecure.length) {
    throw new Error(
      `Refusing to start in production with default ${insecure.join(" and ")}. ` +
        `Set a strong, unique value for each before deploying.`,
    );
  }
}

export async function bootstrap(): Promise<void> {
  assertSecureConfig();
  await connectMongoDB();
  await connectRedis();
  getLogger().info("mogadget core bootstrapped (mongo + redis)");
}
