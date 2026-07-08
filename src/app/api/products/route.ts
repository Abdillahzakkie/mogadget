export const runtime = "nodejs";

import { ok, services, withApiHandler } from "@/server";
import { toPublicProduct } from "@/server/helpers/products/dto";
import { parseProductFilter } from "@/server/helpers/products/parseSearchParams";

export const GET = withApiHandler({ route: "/api/products" }, async (req) => {
  const filter = parseProductFilter(new URL(req.url));
  const rows = await services.products.listProducts(filter);
  return ok(await Promise.all(rows.map(toPublicProduct)));
});
