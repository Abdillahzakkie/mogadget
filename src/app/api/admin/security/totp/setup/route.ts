export const runtime = "nodejs";

import { ErrInvalidFields, fail, ok, requirePermission, services, withApiHandler } from "@/server";

// Begin TOTP enrolment: returns an otpauth URL + QR + the base32 secret (shown once). No audit
// body capture — provisioning material is sensitive.
export const POST = withApiHandler({ route: "/api/admin/security/totp/setup" }, async () => {
  const session = await requirePermission();
  const result = await services.security.totpSetup({
    userId: session.sub,
    username: session.username,
  });
  if (!result.ok) {
    return fail(
      ErrInvalidFields.code,
      "Set CREDENTIAL_ENCRYPTION_KEY before enabling 2FA in production.",
    );
  }
  return ok({ otpauthUrl: result.otpauthUrl, qrDataUrl: result.qrDataUrl, secret: result.secret });
});
