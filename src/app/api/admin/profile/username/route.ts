export const runtime = "nodejs";

import {
  auditAdmin,
  ErrConflict,
  ErrNotFound,
  issueSessionCookie,
  ok,
  requirePermission,
  services,
  signSession,
  validateBody,
  withApiHandler,
} from "@/server";
import { env } from "@/server/constants/environments";
import { changeUsernameSchema } from "@/server/validators/schemas";

export const POST = withApiHandler({ route: "/api/admin/profile/username" }, (req) =>
  auditAdmin(
    async (r) => {
      const session = await requirePermission();
      const { username } = await validateBody(r, changeUsernameSchema);
      const result = await services.profile.changeUsername({ userId: session.sub, username });
      if (!result.ok) {
        if (result.reason === "taken") throw ErrConflict;
        throw ErrNotFound;
      }
      // The session JWT embeds the username; re-issue it so /admin/me and future requests reflect
      // the new value without forcing a re-login.
      const token = await signSession({ sub: session.sub, username: result.profile.username });
      issueSessionCookie("mg_session", token, env.sessionMaxAgeSeconds);
      return ok(result.profile);
    },
    { action: "profile.username.change", targetType: "user", captureBody: true },
  )(req),
);
