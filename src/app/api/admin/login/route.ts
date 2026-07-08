export const runtime = "nodejs";

import {
  ErrUnauthenticated,
  fail,
  getUserByUsernameDB,
  issueSessionCookie,
  ok,
  signSession,
  validateBody,
  verifyPassword,
  withApiHandler,
  withRateLimit,
} from "@/server";
import { adminLoginSchema } from "@/server/validators/schemas";

export const POST = withApiHandler({ route: "/api/admin/login" }, (req) =>
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
