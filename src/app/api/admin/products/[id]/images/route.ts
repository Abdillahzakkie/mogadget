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
        triggerRevalidate([revalidateTags.products, revalidateTags.product(doc.slug)]);
        return ok(toAdminProduct(doc));
      },
      { action: "product.setImages", targetType: "product", captureBody: true },
    )(req);
  },
);
