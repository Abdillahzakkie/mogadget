export const runtime = "nodejs";

import {
  auditAdmin,
  created,
  ErrConflict,
  ErrInvalidFields,
  ok,
  requirePermission,
  services,
  validateBody,
  withApiHandler,
} from "@/server";
import { Permission } from "@/server/validators/iam";
import { createGroupSchema } from "@/server/validators/schemas";

export const GET = withApiHandler({ route: "/api/admin/iam/groups" }, async () => {
  await requirePermission(Permission.IamManage);
  return ok(await services.iam.listGroups());
});

export const POST = withApiHandler({ route: "/api/admin/iam/groups" }, (req) =>
  auditAdmin(
    async (r) => {
      await requirePermission(Permission.IamManage);
      const input = await validateBody(r, createGroupSchema);
      const result = await services.iam.createGroup(input);
      if (result.ok) return created(result.group);
      if (result.reason === "taken") throw ErrConflict;
      throw ErrInvalidFields;
    },
    { action: "iam.group.create", targetType: "group", captureBody: true },
  )(req),
);
