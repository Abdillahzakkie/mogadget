import type { Context } from "hono";
import {
  runWithRequestContext,
  verifySession,
  getQueuedCookies,
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
  const ctx = {
    session,
    requestId: crypto.randomUUID(),
    cookies: [] as { name: string; value: string; maxAge: number }[],
  };
  const envelope: IEnvelope = await runWithRequestContext(ctx, () =>
    handler(c.req.raw, { params: Promise.resolve(c.req.param() as Record<string, string>) }),
  );
  const headers = new Headers({ "content-type": "application/json", ...(envelope.headers ?? {}) });
  for (const ck of getQueuedCookies()) {
    headers.append(
      "set-cookie",
      `${ck.name}=${encodeURIComponent(ck.value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ck.maxAge}`,
    );
  }
  return new Response(JSON.stringify(envelope.body), { status: envelope.status, headers });
}
