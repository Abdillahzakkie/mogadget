import {
  withApiHandler,
  ok,
  fail,
  validateBody,
  withRateLimit,
  signSession,
  verifyPassword,
  issueSessionCookie,
  revokeSessionCookie,
  getUserByUsernameDB,
  ErrUnauthenticated,
} from "@mogadget/core";
import { adminLoginSchema } from "@mogadget/contracts/schemas";

export const LOGIN = withApiHandler({ route: "/api/admin/login" }, (req) =>
  withRateLimit(
    async (r) => {
      const { username, password } = await validateBody(r, adminLoginSchema);
      const user = await getUserByUsernameDB({ username });
      if (!user || !(await verifyPassword(user.passwordHash, password))) {
        return fail(ErrUnauthenticated.code, "Invalid credentials");
      }
      const token = await signSession({ sub: String(user._id), username: user.username });
      issueSessionCookie("mg_session", token, 60 * 60 * 24 * 7);
      return ok({ username: user.username });
    },
    { scope: "login", max: 5, windowSeconds: 15 * 60 },
  )(req),
);

export const LOGOUT = withApiHandler({ route: "/api/admin/logout" }, async () => {
  revokeSessionCookie("mg_session");
  return ok({ ok: true });
});
