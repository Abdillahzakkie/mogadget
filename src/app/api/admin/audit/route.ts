export const runtime = "nodejs";

import { ok, parseOrThrow, requirePermission, services, withApiHandler } from "@/server";
import { Permission } from "@/server/validators/iam";
import { auditQuerySchema } from "@/server/validators/schemas";

export const GET = withApiHandler({ route: "/api/admin/audit" }, async (req) => {
  await requirePermission(Permission.AuditRead);
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const q = parseOrThrow(auditQuerySchema, params);
  const result = await services.audit.queryAuditLogs({
    action: q.action,
    userId: q.userId,
    from: q.from ? new Date(q.from) : undefined,
    to: q.to ? new Date(q.to) : undefined,
    page: q.page,
    limit: q.limit,
  });
  return ok(result);
});
