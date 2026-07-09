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
import { updateGroupSchema } from "@/server/validators/schemas";

interface ICtx {
  params: Promise<{ id: string }>;
}

export const PATCH = withApiHandler<ICtx>({ route: "/api/admin/iam/groups/[id]" }, (req, ctx) =>
  auditAdmin(
    async (r) => {
      await requirePermission(Permission.IamManage);
      const { id } = await ctx.params;
      const patch = await validateBody(r, updateGroupSchema, { patch: true });
      const result = await services.iam.updateGroup({ id, patch });
      if (result.ok) return ok(result.group);
      if (result.reason === "not_found") throw ErrNotFound;
      if (result.reason === "managed") throw ErrConflict;
      throw ErrInvalidFields;
    },
    { action: "iam.group.update", targetType: "group", captureBody: true },
  )(req),
);

export const DELETE = withApiHandler<ICtx>({ route: "/api/admin/iam/groups/[id]" }, (req, ctx) =>
  auditAdmin(
    async () => {
      await requirePermission(Permission.IamManage);
      const { id } = await ctx.params;
      const result = await services.iam.deleteGroup({ id });
      if (result.ok) return ok({ deleted: true });
      if (result.reason === "not_found") throw ErrNotFound;
      throw ErrConflict;
    },
    { action: "iam.group.delete", targetType: "group" },
  )(req),
);
