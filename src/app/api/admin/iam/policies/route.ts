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
import { createPolicySchema } from "@/server/validators/schemas";

export const GET = withApiHandler({ route: "/api/admin/iam/policies" }, async () => {
  await requirePermission(Permission.IamManage);
  return ok(await services.iam.listPolicies());
});

export const POST = withApiHandler({ route: "/api/admin/iam/policies" }, (req) =>
  auditAdmin(
    async (r) => {
      await requirePermission(Permission.IamManage);
      const input = await validateBody(r, createPolicySchema);
      const result = await services.iam.createPolicy(input);
      if (result.ok) return created(result.policy);
      if (result.reason === "taken") throw ErrConflict;
      throw ErrInvalidFields;
    },
    { action: "iam.policy.create", targetType: "policy", captureBody: true },
  )(req),
);
