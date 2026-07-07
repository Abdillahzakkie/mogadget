import { describe, it, expect } from "vitest";
import { newImageKey, resolveImageUrl } from "./storage";

describe("storage keys", () => {
  it("mints a namespaced key with normalized extension", () => {
    const k = newImageKey(".JPG");
    expect(k).toMatch(/^products\/[0-9a-f-]{36}\.jpg$/);
  });
  it("defaults extension to jpg", () => {
    expect(newImageKey("")).toMatch(/\.jpg$/);
  });
  it("resolves a local key to the api /uploads path", () => {
    expect(resolveImageUrl("products/abc.jpg")).toBe(
      "http://localhost:4000/uploads/products/abc.jpg",
    );
  });
  it("passes through already-absolute urls (M1 seed data)", () => {
    expect(resolveImageUrl("https://cdn.example/x.jpg")).toBe("https://cdn.example/x.jpg");
  });
});
