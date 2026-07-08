import { describe, expect, it } from "vitest";
import { generateSlug } from "./slug";

describe("generateSlug", () => {
  it("produces a kebab-case, suffixed, unique slug", () => {
    const a = generateSlug("iPhone 13 128GB UK Used");
    expect(a).toMatch(/^iphone-13-128gb-uk-used-[a-z0-9]{4}$/);
    expect(generateSlug("iPhone 13")).not.toBe(generateSlug("iPhone 13"));
  });
});
