export const runtime = "nodejs";

import {
  auditAdmin,
  ErrInvalidFields,
  fail,
  ok,
  requirePermission,
  services,
  validateBody,
  withApiHandler,
} from "@/server";
import { totpCodeSchema } from "@/server/validators/schemas";

// Regenerate recovery codes (invalidates the old set). Requires a valid TOTP code.
export const POST = withApiHandler({ route: "/api/admin/security/totp/recovery-codes" }, (req) =>
  auditAdmin(
    async (r) => {
      const session = await requirePermission();
      const { code } = await validateBody(r, totpCodeSchema);
      const result = await services.security.regenerateRecoveryCodes({ userId: session.sub, code });
      if (result.ok) return ok({ recoveryCodes: result.recoveryCodes });
      if (result.reason === "not_enabled") {
        return fail(ErrInvalidFields.code, "Enable 2FA first.");
      }
      return fail(ErrInvalidFields.code, "That code didn't match.");
    },
    { action: "security.totp.recovery_codes", targetType: "user" },
  )(req),
);
