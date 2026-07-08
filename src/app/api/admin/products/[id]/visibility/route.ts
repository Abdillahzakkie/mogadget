export const runtime = "nodejs";

import { z } from "zod";
import {
  auditAdmin,
  ErrNotFound,
  ok,
  requirePermission,
  revalidateTags,
  services,
  triggerRevalidate,
  validateBody,
  withApiHandler,
} from "@/server";
import { toAdminProduct } from "@/server/helpers/products/dto";
import { Permission } from "@/server/validators/iam";

interface ICtx {
  params: Promise<{ id: string }>;
}
export const POST = withApiHandler<ICtx>(
  { route: "/api/admin/products/[id]/visibility" },
  async (req, ctx) => {
    const { id } = await ctx.params;
    return auditAdmin(
      async (r) => {
        await requirePermission(Permission.ProductsWrite);
        const { isVisible } = await validateBody(r, z.object({ isVisible: z.boolean() }));
        const doc = await services.products.setVisibility({ id, isVisible });
        if (!doc) throw ErrNotFound;
        triggerRevalidate([revalidateTags.products, revalidateTags.product(doc.slug)]);
        return ok(toAdminProduct(doc));
      },
      { action: "product.setVisibility", targetType: "product", captureBody: true },
    )(req);
  },
);
