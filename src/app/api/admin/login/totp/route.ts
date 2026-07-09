export const runtime = "nodejs";

import {
  ErrUnauthenticated,
  fail,
  issueSessionCookie,
  ok,
  revokeSessionCookie,
  services,
  signSession,
  validateBody,
  verifyPending2fa,
  withApiHandler,
  withRateLimit,
} from "@/server";
import { env } from "@/server/constants/environments";
import { totpCodeSchema } from "@/server/validators/schemas";

function readCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

// Second login step: redeem the pending-2FA cookie plus a TOTP (or recovery) code for a real
// session. Rate-limited to blunt code brute-forcing.
export const POST = withApiHandler({ route: "/api/admin/login/totp" }, (req) =>
  withRateLimit(
    async (r) => {
      const pendingToken = readCookie(r, "mg_2fa");
      const pending = pendingToken ? await verifyPending2fa(pendingToken) : null;
      if (!pending) {
        return fail(ErrUnauthenticated.code, "Your sign-in session expired. Start again.");
      }
      const { code } = await validateBody(r, totpCodeSchema);
      const valid =
        (await services.security.verifyTotpForUser({ userId: pending.sub, code })) ||
        (await services.security.consumeRecoveryCode({ userId: pending.sub, code }));
      if (!valid) return fail(ErrUnauthenticated.code, "Invalid code");

      const token = await signSession({ sub: pending.sub, username: pending.username });
      issueSessionCookie("mg_session", token, env.sessionMaxAgeSeconds);
      revokeSessionCookie("mg_2fa");
      return ok({ username: pending.username });
    },
    { scope: "login-totp", max: 10, windowSeconds: 15 * 60 },
  )(req),
);
