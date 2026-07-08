export const runtime = "nodejs";

import { ok, revokeSessionCookie, withApiHandler } from "@/server";

export const POST = withApiHandler({ route: "/api/admin/logout" }, async () => {
  revokeSessionCookie("mg_session");
  return ok({ ok: true });
});
