import {
  withApiHandler,
  ok,
  services,
  requirePermission,
  auditAdmin,
  validateBody,
  ErrNotFound,
} from "@mogadget/core";
import { Permission } from "@mogadget/contracts/iam";
import { z } from "zod";
import { toPublicProduct } from "../../../../products/dto";

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
        return ok(toPublicProduct(doc));
      },
      { action: "product.setVisibility", targetType: "product", captureBody: true },
    )(req);
  },
);
