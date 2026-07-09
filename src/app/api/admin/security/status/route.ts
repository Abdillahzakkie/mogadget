export const runtime = "nodejs";

import { ok, requirePermission, services, withApiHandler } from "@/server";

// Self-service: current admin's 2FA status (drives the Security settings screen).
export const GET = withApiHandler({ route: "/api/admin/security/status" }, async () => {
  const session = await requirePermission();
  return ok(await services.security.getSecurityStatus({ userId: session.sub }));
});
