import { withApiHandler, ok, services } from "@mogadget/core";

export const GET = withApiHandler({ route: "/api/products/facets" }, async () =>
  ok(await services.products.productFacets()),
);
