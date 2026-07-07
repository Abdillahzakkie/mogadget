import type { TBaseHandler } from "@mogadget/core";
import type { TRouteCtx } from "../lib/adapter";
import * as products from "./products/route";
import * as facets from "./products/facets/route";
import * as productBySlug from "./products/[slug]/route";
import * as click from "./products/[slug]/click/route";
import * as adminProducts from "./admin/products/route";
import * as adminProductById from "./admin/products/[id]/route";
import * as adminStatus from "./admin/products/[id]/status/route";
import * as adminVisibility from "./admin/products/[id]/visibility/route";
import * as adminImages from "./admin/products/[id]/images/route";
import { LOGIN, LOGOUT } from "./auth";

export interface IRouteEntry {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  handler: TBaseHandler<TRouteCtx>;
}

const h = (fn: unknown) => fn as TBaseHandler<TRouteCtx>;

export const manifest: IRouteEntry[] = [
  { method: "GET", path: "/api/products", handler: h(products.GET) },
  { method: "GET", path: "/api/products/facets", handler: h(facets.GET) },
  { method: "GET", path: "/api/products/:slug", handler: h(productBySlug.GET) },
  { method: "POST", path: "/api/products/:slug/click", handler: h(click.POST) },
  { method: "POST", path: "/api/admin/login", handler: h(LOGIN) },
  { method: "POST", path: "/api/admin/logout", handler: h(LOGOUT) },
  { method: "GET", path: "/api/admin/products", handler: h(adminProducts.GET) },
  { method: "POST", path: "/api/admin/products", handler: h(adminProducts.POST) },
  { method: "GET", path: "/api/admin/products/:id", handler: h(adminProductById.GET) },
  { method: "PATCH", path: "/api/admin/products/:id", handler: h(adminProductById.PATCH) },
  { method: "DELETE", path: "/api/admin/products/:id", handler: h(adminProductById.DELETE) },
  { method: "POST", path: "/api/admin/products/:id/status", handler: h(adminStatus.POST) },
  { method: "POST", path: "/api/admin/products/:id/visibility", handler: h(adminVisibility.POST) },
  { method: "POST", path: "/api/admin/products/:id/images", handler: h(adminImages.POST) },
];
