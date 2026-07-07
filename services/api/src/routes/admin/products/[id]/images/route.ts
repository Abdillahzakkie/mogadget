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

// M1 accepts a list of {key,sortOrder}; signed-URL S3 upload lands in M2.
const bodySchema = z.object({
  images: z.array(z.object({ key: z.string().min(1), sortOrder: z.number().int().nonnegative() })),
});

interface ICtx {
  params: Promise<{ id: string }>;
}
export const POST = withApiHandler<ICtx>(
  { route: "/api/admin/products/[id]/images" },
  async (req, ctx) => {
    const { id } = await ctx.params;
    return auditAdmin(
      async (r) => {
        await requirePermission(Permission.ProductsWrite);
        const { images } = await validateBody(r, bodySchema);
        const doc = await services.products.updateProduct({ id, patch: { images } });
        if (!doc) throw ErrNotFound;
        return ok(toPublicProduct(doc));
      },
      { action: "product.setImages", targetType: "product", captureBody: true },
    )(req);
  },
);
