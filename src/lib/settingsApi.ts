import type { ISiteConfig, ISiteConfigPatch } from "@/server/models/siteConfig/types";
import { api } from "../constants/fetcher";

// Client-side calls for the admin settings area. Mirrors adminApi's shape (thin axios wrappers
// returning the unwrapped `data`).
export const settingsApi = {
  getSiteConfig: (): Promise<ISiteConfig> => api.get("/admin/site-config").then((r) => r.data.data),
  updateSiteConfig: (patch: ISiteConfigPatch): Promise<ISiteConfig> =>
    api.patch("/admin/site-config", { patch }).then((r) => r.data.data),
};
