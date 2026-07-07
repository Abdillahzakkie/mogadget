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
import { statusSchema } from "@mogadget/contracts/schemas";
import { z } from "zod";
import { toAdminProduct } from "../../../../products/dto";

interface ICtx {
  params: Promise<{ id: string }>;
}
export const POST = withApiHandler<ICtx>(
  { route: "/api/admin/products/[id]/status" },
  async (req, ctx) => {
    const { id } = await ctx.params;
    return auditAdmin(
      async (r) => {
        await requirePermission(Permission.ProductsWrite);
        const { status } = await validateBody(r, z.object({ status: statusSchema }));
        const doc = await services.products.setStatus({ id, status });
        if (!doc) throw ErrNotFound;
        return ok(toAdminProduct(doc));
      },
      { action: "product.setStatus", targetType: "product", captureBody: true },
    )(req);
  },
);
