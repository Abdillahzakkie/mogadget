export const runtime = "nodejs";

import { ErrUnauthenticated, getSessionUser, ok, services, withApiHandler } from "@/server";

// Start a passkey registration for the signed-in admin: returns the WebAuthn creation options the
// browser feeds to navigator.credentials.create(). The challenge is stashed server-side keyed by
// the current user.
export const POST = withApiHandler({ route: "/api/admin/security/passkeys/options" }, async () => {
  const session = getSessionUser();
  if (!session) throw ErrUnauthenticated;
  const options = await services.passkeys.registrationOptions({
    userId: session.sub,
    username: session.username,
  });
  return ok(options);
});
