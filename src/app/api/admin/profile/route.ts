export const runtime = "nodejs";

import {
  auditAdmin,
  ErrNotFound,
  ok,
  requirePermission,
  services,
  validateBody,
  withApiHandler,
} from "@/server";
import { profilePatchSchema } from "@/server/validators/schemas";

// Self-service: any authenticated admin manages their own profile (no extra permission).
export const GET = withApiHandler({ route: "/api/admin/profile" }, async () => {
  const session = await requirePermission();
  const profile = await services.profile.getMyProfile({ userId: session.sub });
  if (!profile) throw ErrNotFound;
  return ok(profile);
});

export const PATCH = withApiHandler({ route: "/api/admin/profile" }, (req) =>
  auditAdmin(
    async (r) => {
      const session = await requirePermission();
      const patch = await validateBody(r, profilePatchSchema, { patch: true });
      const profile = await services.profile.updateProfile({ userId: session.sub, patch });
      if (!profile) throw ErrNotFound;
      return ok(profile);
    },
    { action: "profile.update", targetType: "user", captureBody: true },
  )(req),
);
