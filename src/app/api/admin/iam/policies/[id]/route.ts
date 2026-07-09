export const runtime = "nodejs";

import {
  auditAdmin,
  ErrConflict,
  ErrInvalidFields,
  ErrNotFound,
  ok,
  requirePermission,
  services,
  validateBody,
  withApiHandler,
} from "@/server";
import { Permission } from "@/server/validators/iam";
import { updatePolicySchema } from "@/server/validators/schemas";

interface ICtx {
  params: Promise<{ id: string }>;
}

export const PATCH = withApiHandler<ICtx>({ route: "/api/admin/iam/policies/[id]" }, (req, ctx) =>
  auditAdmin(
    async (r) => {
      await requirePermission(Permission.IamManage);
      const { id } = await ctx.params;
      const patch = await validateBody(r, updatePolicySchema, { patch: true });
      const result = await services.iam.updatePolicy({ id, patch });
      if (result.ok) return ok(result.policy);
      if (result.reason === "not_found") throw ErrNotFound;
      if (result.reason === "managed") throw ErrConflict;
      throw ErrInvalidFields;
    },
    { action: "iam.policy.update", targetType: "policy", captureBody: true },
  )(req),
);

export const DELETE = withApiHandler<ICtx>({ route: "/api/admin/iam/policies/[id]" }, (req, ctx) =>
  auditAdmin(
    async () => {
      await requirePermission(Permission.IamManage);
      const { id } = await ctx.params;
      const result = await services.iam.deletePolicy({ id });
      if (result.ok) return ok({ deleted: true });
      if (result.reason === "not_found") throw ErrNotFound;
      throw ErrConflict;
    },
    { action: "iam.policy.delete", targetType: "policy" },
  )(req),
);
