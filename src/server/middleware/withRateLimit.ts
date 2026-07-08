import { ErrRateLimited } from "../constants/errors";
import { redis, redisIncr } from "../databases/redis";
import { clientIp } from "../lib/clientIp";
import type { THandler } from "../lib/handler";
import { getClientIp } from "../lib/requestContext";
import { fail } from "../lib/response";

export function withRateLimit(
  handler: THandler,
  options: { scope: string; max?: number; windowSeconds?: number },
): THandler {
  const max = options.max ?? 30;
  const windowSeconds = options.windowSeconds ?? 60;
  return async (req) => {
    // Prefer the handler-resolved address (withApiHandler ran clientIp under the TRUST_PROXY
    // policy); the fallback only applies to handlers invoked outside an HTTP request context
    // (tests).
    const key = `rl:${options.scope}:${getClientIp() ?? clientIp(req)}`;
    const count = await redisIncr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    if (count > max) {
      const ttl = await redis.ttl(key);
      return fail(
        ErrRateLimited.code,
        `Too many requests. Try again in ${ttl < 0 ? windowSeconds : ttl}s`,
      );
    }
    return handler(req);
  };
}
