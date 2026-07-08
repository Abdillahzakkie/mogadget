import { env } from "../constants/environments";
import { ErrRateLimited } from "../constants/errors";
import { redis, redisIncr } from "../databases/redis";
import { restResponseTimeHistogram } from "../metrics";
import { clientIp } from "./clientIp";
import { type IQueuedCookie, runWithRequestContext } from "./requestContext";
import { fail, handleError, type IEnvelope } from "./response";
import { verifySession } from "./session";

export type THandler = (req: Request) => Promise<IEnvelope>;
export type TBaseHandler<TCtx = unknown> = (req: Request, ctx: TCtx) => Promise<IEnvelope>;
export type TRouteHandler<TCtx = unknown> = (req: Request, ctx: TCtx) => Promise<Response>;
export interface IHandlerOptions {
  route: string;
  rateLimit?: { max: number; windowSeconds: number };
}

function readToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)mg_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]!) : null;
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

function toResponse(envelope: IEnvelope, cookies: IQueuedCookie[]): Response {
  const headers = new Headers({ "content-type": "application/json", ...(envelope.headers ?? {}) });
  // Secure in production so the session cookie is never sent over plain HTTP.
  const secure = env.isProduction ? "; Secure" : "";
  for (const ck of cookies) {
    headers.append(
      "set-cookie",
      `${ck.name}=${encodeURIComponent(ck.value)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${ck.maxAge}`,
    );
  }
  return new Response(JSON.stringify(envelope.body), { status: envelope.status, headers });
}

// The single per-request wrapper for every /api route handler. Folds in what the Hono
// adapter used to do (session verify, request-id, client-IP, queued cookies) plus the
// per-route duties (rate limit, metrics, error envelope), and emits a web Response that
// Next's route handlers return as-is.
export function withApiHandler<TCtx = unknown>(
  options: IHandlerOptions,
  handler: TBaseHandler<TCtx>,
): TRouteHandler<TCtx> {
  const max = options.rateLimit?.max ?? 100;
  const windowSeconds = options.rateLimit?.windowSeconds ?? 60;
  return async (req, ctx) => {
    const token = readToken(req);
    const session = token ? await verifySession(token) : null;
    const rctx = {
      session,
      requestId: crypto.randomUUID(),
      cookies: [] as IQueuedCookie[],
      clientIp: clientIp(req),
    };
    const start = process.hrtime.bigint();
    const envelope: IEnvelope = await runWithRequestContext(rctx, async () => {
      let response: IEnvelope;
      try {
        const rl = await consume(rctx.clientIp, options.route, max, windowSeconds);
        if (!rl.allowed) {
          response = fail(ErrRateLimited.code, `Too many requests. Try again in ${rl.retryAfter}s`);
          response.headers = { "Retry-After": String(rl.retryAfter), "X-RateLimit-Remaining": "0" };
        } else {
          response = await handler(req, ctx);
          response.headers = { ...response.headers, "X-RateLimit-Remaining": String(rl.remaining) };
        }
      } catch (err) {
        response = handleError(err);
      }
      return response;
    });
    const elapsed = Number(process.hrtime.bigint() - start) / 1e9;
    restResponseTimeHistogram.observe(
      { method: req.method, route: options.route, status_code: String(envelope.status) },
      elapsed,
    );
    // Cookies were queued by the handler inside the ALS scope, mutating this same array.
    return toResponse(envelope, rctx.cookies);
  };
}
