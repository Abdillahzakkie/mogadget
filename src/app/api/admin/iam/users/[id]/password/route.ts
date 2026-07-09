export const runtime = "nodejs";

import {
  auditAdmin,
  ErrNotFound,
  ok,
  requirePermission,
  services,
  validateBody,
  withApiHandler,
} from "@/server";
import { Permission } from "@/server/validators/iam";
import { resetPasswordSchema } from "@/server/validators/schemas";

interface ICtx {
  params: Promise<{ id: string }>;
}

// Admin resets another user's password. captureBody stays false — never log the plaintext.
export const POST = withApiHandler<ICtx>(
  { route: "/api/admin/iam/users/[id]/password" },
  (req, ctx) =>
    auditAdmin(
      async (r) => {
        await requirePermission(Permission.IamManage);
        const { id } = await ctx.params;
        const { newPassword } = await validateBody(r, resetPasswordSchema);
        const result = await services.iam.resetPassword({ id, newPassword });
        if (!result.ok) throw ErrNotFound;
        return ok({ ok: true });
      },
      { action: "iam.user.reset_password", targetType: "user" },
    )(req),
);
