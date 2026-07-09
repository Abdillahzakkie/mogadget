export const runtime = "nodejs";

import {
  auditAdmin,
  ErrConflict,
  ErrNotFound,
  ErrUnauthorized,
  fail,
  ok,
  requirePermission,
  services,
  validateBody,
  withApiHandler,
} from "@/server";
import { Permission } from "@/server/validators/iam";
import { updateUserAccessSchema } from "@/server/validators/schemas";

interface ICtx {
  params: Promise<{ id: string }>;
}

export const PATCH = withApiHandler<ICtx>({ route: "/api/admin/iam/users/[id]" }, (req, ctx) =>
  auditAdmin(
    async (r) => {
      await requirePermission(Permission.IamManage);
      const { id } = await ctx.params;
      const { groupIds, attachedPolicyIds } = await validateBody(r, updateUserAccessSchema, {
        patch: true,
      });
      const result = await services.iam.updateUserAccess({ id, groupIds, attachedPolicyIds });
      if (result.ok) return ok(result.user);
      if (result.reason === "not_found") throw ErrNotFound;
      return fail(ErrUnauthorized.code, "Refused: this would remove the last administrator.");
    },
    { action: "iam.user.update", targetType: "user", captureBody: true },
  )(req),
);

export const DELETE = withApiHandler<ICtx>({ route: "/api/admin/iam/users/[id]" }, (req, ctx) =>
  auditAdmin(
    async () => {
      const session = await requirePermission(Permission.IamManage);
      const { id } = await ctx.params;
      const result = await services.iam.deleteUser({ id, actingUserId: session.sub });
      if (result.ok) return ok({ deleted: true });
      if (result.reason === "not_found") throw ErrNotFound;
      if (result.reason === "self") {
        return fail(ErrConflict.code, "You cannot delete your own account.");
      }
      return fail(ErrConflict.code, "Refused: this is the last administrator.");
    },
    { action: "iam.user.delete", targetType: "user" },
  )(req),
);
