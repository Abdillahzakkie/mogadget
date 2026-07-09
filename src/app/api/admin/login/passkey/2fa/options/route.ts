export const runtime = "nodejs";

import {
  ErrUnauthenticated,
  fail,
  ok,
  services,
  verifyPending2fa,
  withApiHandler,
  withRateLimit,
} from "@/server";

function readCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

// Second-factor passkey step: options are issued only against a valid pending-2FA cookie and are
// scoped to that user, so the assertion is bound to the password-authenticated account.
export const POST = withApiHandler({ route: "/api/admin/login/passkey/2fa/options" }, (req) =>
  withRateLimit(
    async (r) => {
      const pendingToken = readCookie(r, "mg_2fa");
      const pending = pendingToken ? await verifyPending2fa(pendingToken) : null;
      if (!pending) {
        return fail(ErrUnauthenticated.code, "Your sign-in session expired. Start again.");
      }
      const options = await services.passkeys.authenticationOptions({ userId: pending.sub });
      return ok(options);
    },
    { scope: "passkey-login", max: 30, windowSeconds: 15 * 60 },
  )(req),
);
