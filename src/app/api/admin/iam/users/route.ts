export const runtime = "nodejs";

import {
  auditAdmin,
  created,
  ErrConflict,
  ErrInternal,
  ok,
  requirePermission,
  services,
  validateBody,
  withApiHandler,
} from "@/server";
import { Permission } from "@/server/validators/iam";
import { createUserSchema } from "@/server/validators/schemas";

export const GET = withApiHandler({ route: "/api/admin/iam/users" }, async () => {
  await requirePermission(Permission.IamManage);
  return ok(await services.iam.listUsers());
});

export const POST = withApiHandler({ route: "/api/admin/iam/users" }, (req) =>
  auditAdmin(
    async (r) => {
      await requirePermission(Permission.IamManage);
      const input = await validateBody(r, createUserSchema);
      const result = await services.iam.createUser(input);
      if (result.ok) return created(result.user);
      if (result.reason === "taken") throw ErrConflict;
      throw ErrInternal;
    },
    // captureBody stays false — the body carries a plaintext password we must never persist.
    { action: "iam.user.create", targetType: "user" },
  )(req),
);
