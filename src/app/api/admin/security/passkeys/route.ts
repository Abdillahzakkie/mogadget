export const runtime = "nodejs";

import {
  ErrInvalidFields,
  ErrUnauthenticated,
  getSessionUser,
  ok,
  services,
  withApiHandler,
} from "@/server";

// List the signed-in admin's registered passkeys (safe DTOs — no key material).
export const GET = withApiHandler({ route: "/api/admin/security/passkeys" }, async () => {
  const session = getSessionUser();
  if (!session) throw ErrUnauthenticated;
  const passkeys = await services.passkeys.listPasskeys({ userId: session.sub });
  return ok(passkeys);
});

// Finish registration: verify the ceremony started by POST /options and persist the credential.
// Body: { response: RegistrationResponseJSON, nickname?: string }.
export const POST = withApiHandler({ route: "/api/admin/security/passkeys" }, async (req) => {
  const session = getSessionUser();
  if (!session) throw ErrUnauthenticated;
  const body = (await req.json().catch(() => null)) as {
    response?: unknown;
    nickname?: unknown;
  } | null;
  if (!body || typeof body.response !== "object" || body.response === null) {
    throw ErrInvalidFields;
  }
  const result = await services.passkeys.verifyRegistration({
    userId: session.sub,
    // biome-ignore lint/suspicious/noExplicitAny: WebAuthn response shape is validated by the library.
    response: body.response as any,
    nickname: typeof body.nickname === "string" ? body.nickname : undefined,
  });
  if (!result.verified) throw ErrInvalidFields;
  return ok(result);
});
