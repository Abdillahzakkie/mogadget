import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { env } from "../constants/environments";
import {
  newImageKey,
  putImageBlob,
  readLocalBlob,
  resolveImageUrl,
  signUpload,
  sniffImageType,
  storageDriver,
  writeLocalBlob,
} from "./storage";

// Minimal valid headers for each supported format.
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);

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
  it("resolves a local key to the same-origin /uploads path", async () => {
    expect(await resolveImageUrl("products/abc.jpg")).toBe("/uploads/products/abc.jpg");
  });
  it("passes through already-absolute urls (M1 seed data)", async () => {
    expect(await resolveImageUrl("https://cdn.example/x.jpg")).toBe("https://cdn.example/x.jpg");
  });
  it("defaults to the local driver", () => {
    expect(storageDriver()).toBe("local");
  });
  it("selects the s3 driver when configured", () => {
    const prev = env.storageDriver;
    env.storageDriver = "s3";
    try {
      expect(storageDriver()).toBe("s3");
    } finally {
      env.storageDriver = prev;
    }
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
    expect(publicUrl).toBe(await resolveImageUrl(key));
  });
});

describe("sniffImageType", () => {
  it("identifies each supported format by magic bytes", () => {
    expect(sniffImageType(JPEG)).toEqual({ ext: "jpg", contentType: "image/jpeg" });
    expect(sniffImageType(PNG)).toEqual({ ext: "png", contentType: "image/png" });
    expect(sniffImageType(GIF)).toEqual({ ext: "gif", contentType: "image/gif" });
    expect(sniffImageType(WEBP)).toEqual({ ext: "webp", contentType: "image/webp" });
  });
  it("rejects non-image bytes (e.g. an HTML error page)", () => {
    const html = new TextEncoder().encode("<!doctype html><html>404</html>");
    expect(sniffImageType(html)).toBeNull();
  });
  it("rejects payloads too short to carry a signature", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
  });
  it("rejects a RIFF container that is not WEBP", () => {
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]);
    expect(sniffImageType(wav)).toBeNull();
  });
});

describe("putImageBlob (local driver)", () => {
  it("writes bytes to the local store and reads back with the right content type", async () => {
    const key = newImageKey("png");
    await putImageBlob(key, PNG, "image/png");
    const read = await readLocalBlob(key);
    expect(read?.contentType).toBe("image/png");
    expect([...(read?.bytes ?? [])]).toEqual([...PNG]);
    await fs.rm(path.join(env.localUploadDir, key), { force: true });
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
