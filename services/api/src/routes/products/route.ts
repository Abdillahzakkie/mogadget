import { withApiHandler, ok, services } from "@mogadget/core";
import { parseProductFilter } from "./parseSearchParams";
import { toPublicProduct } from "./dto";

export const GET = withApiHandler({ route: "/api/products" }, async (req) => {
  const filter = parseProductFilter(new URL(req.url));
  const rows = await services.products.listProducts(filter);
  return ok(rows.map(toPublicProduct));
});
