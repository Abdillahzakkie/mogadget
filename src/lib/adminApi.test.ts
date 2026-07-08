import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the axios transport so we can assert URLs/payloads without a network.
// vi.hoisted so the fns exist when the hoisted vi.mock factory runs.
const { post, patch, del, get } = vi.hoisted(() => ({
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
  get: vi.fn(),
}));
vi.mock("../constants/fetcher", () => ({ api: { post, patch, delete: del, get } }));

import { adminApi } from "./adminApi";

const envelope = (data: unknown) => ({ data: { data } });

beforeEach(() => {
  post.mockReset();
  patch.mockReset();
  del.mockReset();
  get.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("adminApi CRUD", () => {
  it("login posts credentials and returns the data payload", async () => {
    post.mockResolvedValue(envelope({ username: "owner" }));
    const out = await adminApi.login("owner", "pw");
    expect(post).toHaveBeenCalledWith("/admin/login", { username: "owner", password: "pw" });
    expect(out).toEqual({ username: "owner" });
  });

  it("create / update / remove hit the right routes", async () => {
    post.mockResolvedValue(envelope({ id: "1" }));
    patch.mockResolvedValue(envelope({ id: "1" }));
    del.mockResolvedValue(envelope({ ok: true }));

    await adminApi.create({ name: "x" });
    expect(post).toHaveBeenCalledWith("/admin/products", { name: "x" });

    await adminApi.update("1", { priceNaira: 5 });
    expect(patch).toHaveBeenCalledWith("/admin/products/1", { priceNaira: 5 });

    await adminApi.remove("1");
    expect(del).toHaveBeenCalledWith("/admin/products/1");
  });

  it("status / visibility / images post to their sub-routes", async () => {
    post.mockResolvedValue(envelope({ id: "1" }));
    await adminApi.setStatus("1", "SOLD");
    expect(post).toHaveBeenCalledWith("/admin/products/1/status", { status: "SOLD" });
    await adminApi.setVisibility("1", false);
    expect(post).toHaveBeenCalledWith("/admin/products/1/visibility", { isVisible: false });
    await adminApi.setImages("1", [{ key: "products/a.jpg", sortOrder: 0 }]);
    expect(post).toHaveBeenCalledWith("/admin/products/1/images", {
      images: [{ key: "products/a.jpg", sortOrder: 0 }],
    });
  });

  it("uploadFile signs then PUTs the bytes to the returned upload url", async () => {
    post.mockResolvedValue(
      envelope({
        uploadUrl: "http://api/blob/abc.jpg",
        key: "products/abc.jpg",
        publicUrl: "http://api/uploads/products/abc.jpg",
      }),
    );
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });
    const res = await adminApi.uploadFile(file);

    expect(post).toHaveBeenCalledWith("/admin/uploads/sign", {
      contentType: "image/jpeg",
      ext: "jpg",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://api/blob/abc.jpg");
    expect((init as { method: string }).method).toBe("PUT");
    expect(res).toEqual({
      key: "products/abc.jpg",
      publicUrl: "http://api/uploads/products/abc.jpg",
    });
  });

  it("uploadFile defaults ext and content-type for a file lacking them", async () => {
    post.mockResolvedValue(
      envelope({ uploadUrl: "http://api/blob/y", key: "products/y.jpg", publicUrl: "u" }),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    // No extension in the name and empty MIME type → ext "" and image/jpeg default.
    const file = new File([new Uint8Array([1])], "noext", { type: "" });
    await adminApi.uploadFile(file);
    expect(post).toHaveBeenCalledWith("/admin/uploads/sign", {
      contentType: "image/jpeg",
      ext: "noext",
    });
  });

  it("uploadFile throws when the storage PUT fails", async () => {
    post.mockResolvedValue(
      envelope({ uploadUrl: "http://api/blob/x", key: "products/x.jpg", publicUrl: "u" }),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const file = new File([new Uint8Array([1])], "x.jpg", { type: "image/jpeg" });
    await expect(adminApi.uploadFile(file)).rejects.toThrow(/upload failed/);
  });
});
