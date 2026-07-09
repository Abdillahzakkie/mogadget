export const runtime = "nodejs";

import {
  ErrInvalidFields,
  ErrUnauthenticated,
  env,
  fail,
  issueSessionCookie,
  ok,
  services,
  signSession,
  withApiHandler,
  withRateLimit,
} from "@/server";
import { getUserByIdDB } from "@/server/models/users";

// Pre-auth (no session): verify a passkey assertion and, on success, issue the same mg_session
// cookie the password login route mints. Body: { response: AuthenticationResponseJSON }.
export const POST = withApiHandler({ route: "/api/admin/login/passkey" }, (req) =>
  withRateLimit(
    async (r) => {
      const body = (await r.json().catch(() => null)) as { response?: unknown } | null;
      if (!body || typeof body.response !== "object" || body.response === null) {
        throw ErrInvalidFields;
      }
      const result = await services.passkeys.verifyAuthentication({
        // biome-ignore lint/suspicious/noExplicitAny: WebAuthn response shape is validated by the library.
        response: body.response as any,
      });
      if (!result.verified || !result.userId) {
        return fail(ErrUnauthenticated.code, "Passkey verification failed");
      }
      const user = await getUserByIdDB({ id: result.userId });
      if (!user) return fail(ErrUnauthenticated.code, "Passkey verification failed");
      const token = await signSession({ sub: String(user._id), username: user.username });
      issueSessionCookie("mg_session", token, env.sessionMaxAgeSeconds);
      return ok({ username: user.username });
    },
    { scope: "passkey-login", max: 10, windowSeconds: 15 * 60 },
  )(req),
);
