import { describe, it, expect } from "vitest";
import { formatNaira, whatsappMessage, whatsappLink, instagramLink } from "./format";

describe("web formatNaira", () => {
  it("matches the ₦450,000 style", () => {
    expect(formatNaira(450000)).toBe("₦450,000");
  });
});

describe("whatsappMessage", () => {
  it("includes name, formatted price, and the canonical product URL", () => {
    const msg = whatsappMessage({
      name: "iPhone 13 128GB",
      priceNaira: 485000,
      slug: "iphone-13-128gb-a3f9",
      siteUrl: "https://mogadget.ng",
    });
    expect(msg).toContain("iPhone 13 128GB");
    expect(msg).toContain("₦485,000");
    expect(msg).toContain("https://mogadget.ng/products/iphone-13-128gb-a3f9");
  });

  it("normalizes a trailing slash on siteUrl", () => {
    const msg = whatsappMessage({
      name: "X",
      priceNaira: 1000,
      slug: "x",
      siteUrl: "https://mogadget.ng/",
    });
    expect(msg).toContain("https://mogadget.ng/products/x");
    expect(msg).not.toContain("//products");
  });
});

describe("whatsappLink", () => {
  it("builds a wa.me link with URL-encoded prefilled text", () => {
    const link = whatsappLink({
      phone: "2348060248044",
      name: "AirPods Pro",
      priceNaira: 250000,
      slug: "airpods-pro",
      siteUrl: "https://mogadget.ng",
    });
    expect(link.startsWith("https://wa.me/2348060248044?text=")).toBe(true);
    expect(link).toContain(encodeURIComponent("₦250,000"));
    expect(link).not.toContain(" ");
  });
});

describe("instagramLink", () => {
  it("strips a leading @ and builds the profile URL", () => {
    expect(instagramLink("@Mo_gadgets")).toBe("https://instagram.com/Mo_gadgets");
    expect(instagramLink("Mo_gadgets")).toBe("https://instagram.com/Mo_gadgets");
  });
});
