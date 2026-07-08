export const runtime = "nodejs";

import { ok, services, withApiHandler } from "@/server";

export const GET = withApiHandler({ route: "/api/products/facets" }, async () =>
  ok(await services.products.productFacets()),
);
