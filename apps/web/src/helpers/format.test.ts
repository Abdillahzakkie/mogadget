import { describe, it, expect } from "vitest";
import { formatNaira } from "./format";

describe("web formatNaira", () => {
  it("matches the ₦450,000 style", () => {
    expect(formatNaira(450000)).toBe("₦450,000");
  });
});
