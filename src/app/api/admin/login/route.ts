export const runtime = "nodejs";

import {
  ErrUnauthenticated,
  fail,
  getUserByUsernameDB,
  issueSessionCookie,
  ok,
  services,
  signPending2fa,
  signSession,
  validateBody,
  verifyPassword,
  withApiHandler,
  withRateLimit,
} from "@/server";
import { env } from "@/server/constants/environments";
import { listCredentialsByUserDB } from "@/server/models/webauthnCredentials";
import { adminLoginSchema } from "@/server/validators/schemas";

export const POST = withApiHandler({ route: "/api/admin/login" }, (req) =>
  withRateLimit(
    async (r) => {
      const { username, password } = await validateBody(r, adminLoginSchema);
      const user = await getUserByUsernameDB({ username });
      if (!user || !(await verifyPassword(user.passwordHash, password))) {
        return fail(ErrUnauthenticated.code, "Invalid credentials");
      }
      const userId = String(user._id);

      // A second factor is required whenever the account has one available: TOTP enabled OR at
      // least one passkey registered. In that case the password step only earns a short-lived
      // pending token (a separate cookie that can NOT authorize /admin); the user then satisfies
      // either factor — a TOTP/recovery code at /login/totp or a passkey at /login/passkey/2fa —
      // to swap it for a real session. `factors` tells the client which options to offer.
      const { totpEnabled } = await services.security.getSecurityStatus({ userId });
      const hasPasskey = (await listCredentialsByUserDB({ userId })).length > 0;
      if (totpEnabled || hasPasskey) {
        const pending = await signPending2fa({ sub: userId, username: user.username });
        issueSessionCookie("mg_2fa", pending, 5 * 60);
        return ok({
          mfaRequired: true,
          username: user.username,
          factors: { totp: totpEnabled, passkey: hasPasskey },
        });
      }

      const token = await signSession({ sub: userId, username: user.username });
      issueSessionCookie("mg_session", token, env.sessionMaxAgeSeconds);
      return ok({ mfaRequired: false, username: user.username });
    },
    { scope: "login", max: 5, windowSeconds: 15 * 60 },
  )(req),
);
