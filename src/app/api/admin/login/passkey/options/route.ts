export const runtime = "nodejs";

import { ok, services, withApiHandler, withRateLimit } from "@/server";

// Pre-auth (no session): return WebAuthn request options for passwordless login. Rate-limited to
// blunt credential-stuffing / enumeration attempts.
export const POST = withApiHandler({ route: "/api/admin/login/passkey/options" }, (req) =>
  withRateLimit(
    async () => {
      const options = await services.passkeys.authenticationOptions();
      return ok(options);
    },
    { scope: "passkey-login", max: 30, windowSeconds: 15 * 60 },
  )(req),
);
