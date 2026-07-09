export const runtime = "nodejs";

import {
  auditAdmin,
  ErrInvalidFields,
  ErrNotFound,
  ErrUnauthenticated,
  fail,
  ok,
  requirePermission,
  services,
  validateBody,
  withApiHandler,
  withRateLimit,
} from "@/server";
import { changePasswordSchema } from "@/server/validators/schemas";

export const POST = withApiHandler({ route: "/api/admin/profile/password" }, (req) =>
  withRateLimit(
    (r) =>
      auditAdmin(
        async (rr) => {
          const session = await requirePermission();
          const { currentPassword, newPassword } = await validateBody(rr, changePasswordSchema);
          const result = await services.profile.changePassword({
            userId: session.sub,
            currentPassword,
            newPassword,
          });
          if (result.ok) return ok({ ok: true });
          if (result.reason === "not_found") throw ErrNotFound;
          if (result.reason === "wrong_current") {
            return fail(ErrUnauthenticated.code, "Current password is incorrect");
          }
          return fail(ErrInvalidFields.code, "New password must be different from the current one");
        },
        { action: "profile.password.change", targetType: "user" },
      )(r),
    { scope: "password-change", max: 5, windowSeconds: 15 * 60 },
  )(req),
);
