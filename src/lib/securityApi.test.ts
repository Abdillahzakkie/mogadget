import { beforeEach, describe, expect, it, vi } from "vitest";

const { post, patch, del, get } = vi.hoisted(() => ({
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
  get: vi.fn(),
}));
const { startRegistration, startAuthentication } = vi.hoisted(() => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));
vi.mock("../constants/fetcher", () => ({ api: { post, patch, delete: del, get } }));
vi.mock("@simplewebauthn/browser", () => ({ startRegistration, startAuthentication }));

import { loginWithPasskey, securityApi } from "./securityApi";

const envelope = (data: unknown) => ({ data: { data } });
beforeEach(() => {
  post.mockReset();
  patch.mockReset();
  del.mockReset();
  get.mockReset();
  startRegistration.mockReset();
  startAuthentication.mockReset();
});

describe("securityApi TOTP", () => {
  it("hits the right routes for status/setup/enable/disable/regenerate", async () => {
    get.mockResolvedValue(envelope({ totpEnabled: false, recoveryCodesRemaining: 0 }));
    post.mockResolvedValue(envelope({ ok: true }));

    await securityApi.getStatus();
    expect(get).toHaveBeenCalledWith("/admin/security/status");
    await securityApi.setupTotp();
    expect(post).toHaveBeenCalledWith("/admin/security/totp/setup");
    await securityApi.enableTotp("123456");
    expect(post).toHaveBeenCalledWith("/admin/security/totp/enable", { code: "123456" });
    await securityApi.disableTotp("123456");
    expect(post).toHaveBeenCalledWith("/admin/security/totp/disable", { code: "123456" });
    await securityApi.regenerateRecoveryCodes("123456");
    expect(post).toHaveBeenCalledWith("/admin/security/totp/recovery-codes", { code: "123456" });
  });
});

describe("securityApi passkeys", () => {
  it("registers via options → startRegistration → post", async () => {
    post
      .mockResolvedValueOnce(envelope({ challenge: "abc" })) // options
      .mockResolvedValueOnce(envelope({ verified: true })); // verify
    startRegistration.mockResolvedValue({ id: "cred" });

    const res = await securityApi.registerPasskey("My key");
    expect(post).toHaveBeenNthCalledWith(1, "/admin/security/passkeys/options");
    expect(startRegistration).toHaveBeenCalledWith({ optionsJSON: { challenge: "abc" } });
    expect(post).toHaveBeenNthCalledWith(2, "/admin/security/passkeys", {
      response: { id: "cred" },
      nickname: "My key",
    });
    expect(res).toEqual({ verified: true });
  });

  it("lists / renames / deletes passkeys", async () => {
    get.mockResolvedValue(envelope([{ id: "p1" }]));
    patch.mockResolvedValue(envelope({ id: "p1", nickname: "renamed" }));
    del.mockResolvedValue(envelope({ deleted: true }));

    await securityApi.listPasskeys();
    expect(get).toHaveBeenCalledWith("/admin/security/passkeys");
    await securityApi.renamePasskey("p1", "renamed");
    expect(patch).toHaveBeenCalledWith("/admin/security/passkeys/p1", { nickname: "renamed" });
    await securityApi.deletePasskey("p1");
    expect(del).toHaveBeenCalledWith("/admin/security/passkeys/p1");
  });

  it("logs in via passkey (options → startAuthentication → verify)", async () => {
    post
      .mockResolvedValueOnce(envelope({ challenge: "xyz" }))
      .mockResolvedValueOnce(envelope({ username: "owner" }));
    startAuthentication.mockResolvedValue({ id: "assertion" });

    const res = await loginWithPasskey();
    expect(post).toHaveBeenNthCalledWith(1, "/admin/login/passkey/options");
    expect(startAuthentication).toHaveBeenCalledWith({ optionsJSON: { challenge: "xyz" } });
    expect(post).toHaveBeenNthCalledWith(2, "/admin/login/passkey", {
      response: { id: "assertion" },
    });
    expect(res).toEqual({ username: "owner" });
  });
});
