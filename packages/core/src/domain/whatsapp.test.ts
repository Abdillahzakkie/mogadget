import { describe, it, expect } from "vitest";
import { buildWhatsAppLink } from "./whatsapp";

describe("buildWhatsAppLink", () => {
  it("builds an encoded wa.me deep link with name, price, and url", () => {
    const href = buildWhatsAppLink({
      name: "iPhone 13 128GB",
      priceNaira: 485000,
      url: "https://mo.ng/products/x",
    });
    expect(href.startsWith("https://wa.me/2348060248044?text=")).toBe(true);
    const text = decodeURIComponent(href.split("text=")[1]!);
    expect(text).toContain("iPhone 13 128GB");
    expect(text).toContain("₦485,000");
    expect(text).toContain("https://mo.ng/products/x");
  });
});
