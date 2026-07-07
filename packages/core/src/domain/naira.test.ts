import { describe, it, expect } from "vitest";
import { formatNaira } from "./naira";

describe("formatNaira", () => {
  it("formats with thousands separators and the ₦ glyph", () => {
    expect(formatNaira(485000)).toBe("₦485,000");
    expect(formatNaira(1850000)).toBe("₦1,850,000");
  });
});
