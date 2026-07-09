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

// Confirm enrolment with a live code; returns the recovery codes once. captureBody stays false
// (the body is a live OTP).
export const POST = withApiHandler({ route: "/api/admin/security/totp/enable" }, (req) =>
  auditAdmin(
    async (r) => {
      const session = await requirePermission();
      const { code } = await validateBody(r, totpCodeSchema);
      const result = await services.security.totpEnable({ userId: session.sub, code });
      if (result.ok) return ok({ recoveryCodes: result.recoveryCodes });
      if (result.reason === "no_setup") {
        return fail(ErrInvalidFields.code, "Start setup first.");
      }
      return fail(ErrInvalidFields.code, "That code didn't match. Try again.");
    },
    { action: "security.totp.enable", targetType: "user" },
  )(req),
);
