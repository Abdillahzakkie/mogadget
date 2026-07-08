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
import { statusSchema } from "@/server/validators/schemas";

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
        triggerRevalidate([revalidateTags.products, revalidateTags.product(doc.slug)]);
        return ok(toAdminProduct(doc));
      },
      { action: "product.setStatus", targetType: "product", captureBody: true },
    )(req);
  },
);
