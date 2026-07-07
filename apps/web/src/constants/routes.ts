export const routes = {
  home: "/",
  catalog: "/products",
  product: (slug: string) => `/products/${slug}`,
  contact: "/contact",
  adminLogin: "/admin/login",
  admin: "/admin",
  adminNew: "/admin/products/new",
  adminEdit: (id: string) => `/admin/products/${id}`,
};
