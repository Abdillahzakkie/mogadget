export const runtime = "nodejs";

import { ErrUnauthenticated, getSessionUser, ok, services, withApiHandler } from "@/server";

// Lightweight "who am I": the current admin's identity plus their effective permission set.
// Client chrome (settings nav, action gating) reads this to show only what the user may access;
// the server still enforces every permission independently at each route.
export const GET = withApiHandler({ route: "/api/admin/me" }, async () => {
  const session = getSessionUser();
  if (!session) throw ErrUnauthenticated;
  const permissions = await services.iam.resolveEffectivePermissions({ userId: session.sub });
  return ok({ sub: session.sub, username: session.username, permissions });
});
