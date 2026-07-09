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

      // If 2FA is enabled, the password step only earns a short-lived pending token (carried in a
      // separate cookie that can NOT authorize /admin). The second step at /login/totp swaps it
      // for a real session.
      const { totpEnabled } = await services.security.getSecurityStatus({ userId });
      if (totpEnabled) {
        const pending = await signPending2fa({ sub: userId, username: user.username });
        issueSessionCookie("mg_2fa", pending, 5 * 60);
        return ok({ mfaRequired: true, username: user.username });
      }

      const token = await signSession({ sub: userId, username: user.username });
      issueSessionCookie("mg_session", token, env.sessionMaxAgeSeconds);
      return ok({ mfaRequired: false, username: user.username });
    },
    { scope: "login", max: 5, windowSeconds: 15 * 60 },
  )(req),
);
