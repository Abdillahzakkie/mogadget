export const runtime = "nodejs";

import {
  auditAdmin,
  created,
  ErrInvalidFields,
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
import { createProductSchema } from "@/server/validators/schemas";

export const GET = withApiHandler({ route: "/api/admin/products" }, async () => {
  await requirePermission(Permission.ProductsWrite);
  const rows = await services.products.listProducts({ status: "all", includeHidden: true });
  return ok(await Promise.all(rows.map(toAdminProduct)));
});

export const POST = withApiHandler({ route: "/api/admin/products" }, (req) =>
  auditAdmin(
    async (r) => {
      await requirePermission(Permission.ProductsWrite);
      const input = await validateBody(r, createProductSchema);
      const doc = await services.products.createProduct(input);
      if (!doc) throw ErrInvalidFields;
      triggerRevalidate([revalidateTags.products, revalidateTags.product(doc.slug)]);
      return created(await toAdminProduct(doc));
    },
    { action: "product.create", targetType: "product", captureBody: true },
  )(req),
);
