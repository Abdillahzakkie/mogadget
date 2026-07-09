export const runtime = "nodejs";

import { ok, requirePermission, services, withApiHandler } from "@/server";
import { Permission } from "@/server/validators/iam";

export const GET = withApiHandler({ route: "/api/admin/analytics/clicks" }, async (req) => {
  await requirePermission(Permission.AnalyticsRead);
  const raw = new URL(req.url).searchParams.get("days");
  const days = raw ? Number(raw) : undefined;
  // clickTrends clamps any out-of-range/NaN window to the 30-day default.
  return ok(await services.analytics.clickTrends({ days }));
});
