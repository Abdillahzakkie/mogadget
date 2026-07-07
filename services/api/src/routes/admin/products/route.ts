import {
  withApiHandler,
  ok,
  created,
  services,
  requirePermission,
  auditAdmin,
  validateBody,
  ErrInvalidFields,
} from "@mogadget/core";
import { Permission } from "@mogadget/contracts/iam";
import { createProductSchema } from "@mogadget/contracts/schemas";
import { toPublicProduct } from "../../products/dto";

export const GET = withApiHandler({ route: "/api/admin/products" }, async () => {
  await requirePermission(Permission.ProductsWrite);
  const rows = await services.products.listProducts({ status: "all", includeHidden: true });
  return ok(rows.map(toPublicProduct));
});

export const POST = withApiHandler({ route: "/api/admin/products" }, (req) =>
  auditAdmin(
    async (r) => {
      await requirePermission(Permission.ProductsWrite);
      const input = await validateBody(r, createProductSchema);
      const doc = await services.products.createProduct(input);
      if (!doc) throw ErrInvalidFields;
      return created(toPublicProduct(doc));
    },
    { action: "product.create", targetType: "product", captureBody: true },
  )(req),
);
