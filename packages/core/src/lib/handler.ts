import { clientIp } from "./clientIp";
import { redis, redisIncr } from "../databases/redis";
import { restResponseTimeHistogram } from "../metrics";
import { fail, handleError, type IEnvelope } from "./response";
import { ErrRateLimited } from "../constants/errors";

export type THandler = (req: Request) => Promise<IEnvelope>;
export type TBaseHandler<TCtx = unknown> = (req: Request, ctx: TCtx) => Promise<IEnvelope>;
export interface IHandlerOptions {
  route: string;
  rateLimit?: { max: number; windowSeconds: number };
}

async function consume(
  ip: string,
  route: string,
  max: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const key = `rl:${route}:${ip}`;
  const count = await redisIncr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  const ttl = await redis.ttl(key);
  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    retryAfter: ttl < 0 ? windowSeconds : ttl,
  };
}

export function withApiHandler<TCtx = unknown>(
  options: IHandlerOptions,
  handler: TBaseHandler<TCtx>,
): TBaseHandler<TCtx> {
  const max = options.rateLimit?.max ?? 100;
  const windowSeconds = options.rateLimit?.windowSeconds ?? 60;
  return async (req, ctx) => {
    const ip = clientIp(req);
    const start = process.hrtime.bigint();
    let response: IEnvelope;
    try {
      const rl = await consume(ip, options.route, max, windowSeconds);
      if (!rl.allowed) {
        response = fail(ErrRateLimited.code, `Too many requests. Try again in ${rl.retryAfter}s`);
        response.headers = { "Retry-After": String(rl.retryAfter), "X-RateLimit-Remaining": "0" };
      } else {
        response = await handler(req, ctx);
        response.headers = {
          ...response.headers,
          "X-RateLimit-Remaining": String(rl.remaining),
        };
      }
    } catch (err) {
      response = handleError(err);
    }
    const elapsed = Number(process.hrtime.bigint() - start) / 1e9;
    restResponseTimeHistogram.observe(
      { method: req.method, route: options.route, status_code: String(response.status) },
      elapsed,
    );
    return response;
  };
}
