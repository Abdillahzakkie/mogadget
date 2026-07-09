import { beforeEach, describe, expect, it, vi } from "vitest";

const { post, patch, get } = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn(), get: vi.fn() }));
vi.mock("../constants/fetcher", () => ({ api: { post, patch, get } }));

import { settingsApi } from "./settingsApi";

const envelope = (data: unknown) => ({ data: { data } });
beforeEach(() => {
  post.mockReset();
  patch.mockReset();
  get.mockReset();
});

describe("settingsApi", () => {
  it("reads and patches site config", async () => {
    get.mockResolvedValue(envelope({ businessName: "MoGadget" }));
    patch.mockResolvedValue(envelope({ businessName: "MoGadget NG" }));

    expect(await settingsApi.getSiteConfig()).toEqual({ businessName: "MoGadget" });
    expect(get).toHaveBeenCalledWith("/admin/site-config");

    await settingsApi.updateSiteConfig({ businessName: "MoGadget NG" });
    expect(patch).toHaveBeenCalledWith("/admin/site-config", {
      patch: { businessName: "MoGadget NG" },
    });
  });

  it("updates profile, username, and password", async () => {
    patch.mockResolvedValue(envelope({ username: "owner" }));
    post.mockResolvedValue(envelope({ ok: true }));

    await settingsApi.updateProfile({ displayName: "Mo" });
    expect(patch).toHaveBeenCalledWith("/admin/profile", { patch: { displayName: "Mo" } });

    post.mockResolvedValue(envelope({ username: "owner2" }));
    await settingsApi.changeUsername("owner2");
    expect(post).toHaveBeenCalledWith("/admin/profile/username", { username: "owner2" });

    post.mockResolvedValue(envelope({ ok: true }));
    await settingsApi.changePassword("old", "newlongpassword");
    expect(post).toHaveBeenCalledWith("/admin/profile/password", {
      currentPassword: "old",
      newPassword: "newlongpassword",
    });
  });
});
