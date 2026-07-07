export * from "./constants";
export * from "./domain";
export * from "./lib";
export * from "./middleware";
export * as models from "./models";
export * as services from "./services";
export * from "./databases";
export * from "./metrics";
export * from "./runtime";

// Re-export commonly-used model *DB functions for flat imports in the API layer.
export {
  getProductByIdDB,
  getProductBySlugAnyStatusDB,
} from "./models/products";
export { getUserByUsernameDB } from "./models/users";

// Domain entity types for flat imports.
export type {
  IProduct,
  IProductImage,
  IProductSpec,
  IProductListFilter,
} from "./models/products/types";
