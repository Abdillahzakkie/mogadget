import type { THandler } from "../lib/handler";
import { clientIp } from "../lib/clientIp";
import { redis, redisIncr } from "../databases/redis";
import { fail } from "../lib/response";
import { ErrRateLimited } from "../constants/errors";

export function withRateLimit(
  handler: THandler,
  options: { scope: string; max?: number; windowSeconds?: number },
): THandler {
  const max = options.max ?? 30;
  const windowSeconds = options.windowSeconds ?? 60;
  return async (req) => {
    const key = `rl:${options.scope}:${clientIp(req)}`;
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
