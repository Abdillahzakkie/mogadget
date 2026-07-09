import type { ISiteConfig, ISiteConfigPatch } from "@/server/models/siteConfig/types";
import type { IUserProfileDto, IUserProfilePatch } from "@/server/models/users/types";
import { api } from "../constants/fetcher";

// Client-side calls for the admin settings area. Mirrors adminApi's shape (thin axios wrappers
// returning the unwrapped `data`).
export const settingsApi = {
  getSiteConfig: (): Promise<ISiteConfig> => api.get("/admin/site-config").then((r) => r.data.data),
  updateSiteConfig: (patch: ISiteConfigPatch): Promise<ISiteConfig> =>
    api.patch("/admin/site-config", { patch }).then((r) => r.data.data),

  // Profile (self-service)
  updateProfile: (patch: IUserProfilePatch): Promise<IUserProfileDto> =>
    api.patch("/admin/profile", { patch }).then((r) => r.data.data),
  changeUsername: (username: string): Promise<IUserProfileDto> =>
    api.post("/admin/profile/username", { username }).then((r) => r.data.data),
  changePassword: (currentPassword: string, newPassword: string): Promise<{ ok: boolean }> =>
    api.post("/admin/profile/password", { currentPassword, newPassword }).then((r) => r.data.data),
};

export interface IAuditRow {
  _id: string;
  username: string;
  action: string;
  targetType?: string;
  responseCode: number;
  durationMs: number;
  createdAt: string;
}
export interface IAuditPage {
  items: IAuditRow[];
  total: number;
  page: number;
  limit: number;
}
