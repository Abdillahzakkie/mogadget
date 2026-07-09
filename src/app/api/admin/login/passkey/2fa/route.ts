export const runtime = "nodejs";

import {
  ErrInvalidFields,
  ErrUnauthenticated,
  env,
  fail,
  issueSessionCookie,
  ok,
  revokeSessionCookie,
  services,
  signSession,
  verifyPending2fa,
  withApiHandler,
  withRateLimit,
} from "@/server";

function readCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

// Second login step via passkey: redeem the pending-2FA cookie plus a passkey assertion for a real
// session. The ceremony is verified against the pending user's challenge, and the asserted
// credential must belong to that same user — so a passkey can only complete the session of the
// account that just passed the password step. Body: { response: AuthenticationResponseJSON }.
export const POST = withApiHandler({ route: "/api/admin/login/passkey/2fa" }, (req) =>
  withRateLimit(
    async (r) => {
      const pendingToken = readCookie(r, "mg_2fa");
      const pending = pendingToken ? await verifyPending2fa(pendingToken) : null;
      if (!pending) {
        return fail(ErrUnauthenticated.code, "Your sign-in session expired. Start again.");
      }
      const body = (await r.json().catch(() => null)) as { response?: unknown } | null;
      if (!body || typeof body.response !== "object" || body.response === null) {
        throw ErrInvalidFields;
      }
      const result = await services.passkeys.verifyAuthentication({
        userId: pending.sub,
        // biome-ignore lint/suspicious/noExplicitAny: WebAuthn response shape is validated by the library.
        response: body.response as any,
      });
      if (!result.verified || result.userId !== pending.sub) {
        return fail(ErrUnauthenticated.code, "Passkey verification failed");
      }

      const token = await signSession({ sub: pending.sub, username: pending.username });
      issueSessionCookie("mg_session", token, env.sessionMaxAgeSeconds);
      revokeSessionCookie("mg_2fa");
      return ok({ username: pending.username });
    },
    { scope: "login-totp", max: 10, windowSeconds: 15 * 60 },
  )(req),
);
