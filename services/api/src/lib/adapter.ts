import type { Context } from "hono";
import {
  clientIp,
  env,
  runWithRequestContext,
  verifySession,
  type IEnvelope,
  type TBaseHandler,
} from "@mogadget/core";

export type TRouteCtx = { params: Promise<Record<string, string>> };

function readToken(c: Context): string | null {
  const auth = c.req.header("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookie = c.req.header("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)mg_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]!) : null;
}

export async function runRoute(
  c: Context,
  handler: TBaseHandler<TRouteCtx>,
): Promise<Response> {
  const token = readToken(c);
  const session = token ? await verifySession(token) : null;
  // @hono/node-server exposes the raw socket; its address is the only client identity that
  // can't be spoofed by request headers (clientIp only consults headers under TRUST_PROXY).
  const socketIp = (c.env as { incoming?: { socket?: { remoteAddress?: string } } })?.incoming
    ?.socket?.remoteAddress;
  const ctx = {
    session,
    requestId: crypto.randomUUID(),
    cookies: [] as { name: string; value: string; maxAge: number }[],
    clientIp: clientIp(c.req.raw, socketIp),
  };
  const envelope: IEnvelope = await runWithRequestContext(ctx, () =>
    handler(c.req.raw, { params: Promise.resolve(c.req.param() as Record<string, string>) }),
  );
  const headers = new Headers({ "content-type": "application/json", ...(envelope.headers ?? {}) });
  // Read cookies from ctx directly: the handler mutated this same array inside the ALS scope,
  // which has since exited — getQueuedCookies() here would read an empty store.
  // Secure in production so the session cookie is never sent over plain HTTP.
  const secure = env.isProduction ? "; Secure" : "";
  for (const ck of ctx.cookies) {
    headers.append(
      "set-cookie",
      `${ck.name}=${encodeURIComponent(ck.value)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${ck.maxAge}`,
    );
  }
  return new Response(JSON.stringify(envelope.body), { status: envelope.status, headers });
}
