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

export const POST = withApiHandler({ route: "/api/admin/security/totp/disable" }, (req) =>
  auditAdmin(
    async (r) => {
      const session = await requirePermission();
      const { code } = await validateBody(r, totpCodeSchema);
      const result = await services.security.totpDisable({ userId: session.sub, code });
      if (result.ok) return ok({ ok: true });
      return fail(ErrInvalidFields.code, "A valid code is required to disable 2FA.");
    },
    { action: "security.totp.disable", targetType: "user" },
  )(req),
);
