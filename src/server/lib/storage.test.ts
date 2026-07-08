import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { env } from "../constants/environments";
import {
  newImageKey,
  readLocalBlob,
  resolveImageUrl,
  signUpload,
  storageDriver,
  writeLocalBlob,
} from "./storage";

describe("storage keys", () => {
  it("mints a namespaced key with normalized extension", () => {
    const k = newImageKey(".JPG");
    expect(k).toMatch(/^products\/[0-9a-f-]{36}\.jpg$/);
  });
  it("strips unsafe characters and defaults extension to jpg", () => {
    expect(newImageKey("")).toMatch(/\.jpg$/);
    expect(newImageKey("pn!g")).toMatch(/\.png$/);
    expect(newImageKey("###")).toMatch(/\.jpg$/); // all chars stripped → fallback
  });
  it("resolves a local key to the same-origin /uploads path", () => {
    expect(resolveImageUrl("products/abc.jpg")).toBe("/uploads/products/abc.jpg");
  });
  it("passes through already-absolute urls (M1 seed data)", () => {
    expect(resolveImageUrl("https://cdn.example/x.jpg")).toBe("https://cdn.example/x.jpg");
  });
  it("defaults to the local driver", () => {
    expect(storageDriver()).toBe("local");
  });
});

describe("signUpload (local driver)", () => {
  it("returns a key, a same-origin single-segment upload url, and a public url", async () => {
    const { key, uploadUrl, publicUrl } = await signUpload({
      contentType: "image/png",
      ext: "png",
    });
    expect(key).toMatch(/^products\/[0-9a-f-]{36}\.png$/);
    // The route's [key] matches one segment, so the upload URL carries only the filename.
    const fileName = key.split("/").pop()!;
    expect(uploadUrl).toBe(`/api/admin/uploads/blob/${fileName}`);
    expect(publicUrl).toBe(resolveImageUrl(key));
  });
});

describe("local blob read/write", () => {
  it("round-trips bytes and reports the content type from the extension", async () => {
    const key = newImageKey("png");
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    await writeLocalBlob(key, bytes);
    const read = await readLocalBlob(key);
    expect(read?.contentType).toBe("image/png");
    expect([...(read?.bytes ?? [])]).toEqual([1, 2, 3, 4, 5]);
    await fs.rm(path.join(env.localUploadDir, key), { force: true });
  });
  it("returns null for a missing blob", async () => {
    expect(await readLocalBlob("products/does-not-exist.jpg")).toBeNull();
  });
  it("falls back to octet-stream for an unknown extension", async () => {
    const key = "products/blob-unknown.bin";
    await writeLocalBlob(key, new Uint8Array([9]));
    expect((await readLocalBlob(key))?.contentType).toBe("application/octet-stream");
    await fs.rm(path.join(env.localUploadDir, key), { force: true });
  });
  it("rejects keys that escape the products namespace or use a dot segment", async () => {
    await expect(writeLocalBlob("../evil.jpg", new Uint8Array([0]))).rejects.toThrow("invalid key");
    await expect(writeLocalBlob("products/..", new Uint8Array([0]))).rejects.toThrow("invalid key");
    await expect(writeLocalBlob("products/no-ext", new Uint8Array([0]))).rejects.toThrow(
      "invalid key",
    );
  });
});
