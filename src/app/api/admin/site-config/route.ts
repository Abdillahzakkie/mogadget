export const runtime = "nodejs";

import {
  auditAdmin,
  ErrInternal,
  ok,
  requirePermission,
  services,
  validateBody,
  withApiHandler,
} from "@/server";
import { Permission } from "@/server/validators/iam";
import { siteConfigPatchSchema } from "@/server/validators/schemas";

export const GET = withApiHandler({ route: "/api/admin/site-config" }, async () => {
  await requirePermission(Permission.SettingsWrite);
  return ok(await services.siteConfig.getSiteConfig({ refreshCache: true }));
});

export const PATCH = withApiHandler({ route: "/api/admin/site-config" }, (req) =>
  auditAdmin(
    async (r) => {
      await requirePermission(Permission.SettingsWrite);
      const patch = await validateBody(r, siteConfigPatchSchema, { patch: true });
      const saved = await services.siteConfig.updateSiteConfig(patch);
      if (!saved) throw ErrInternal;
      return ok(saved);
    },
    { action: "siteConfig.update", targetType: "siteConfig", captureBody: true },
  )(req),
);
