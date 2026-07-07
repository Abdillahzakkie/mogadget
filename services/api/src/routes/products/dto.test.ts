import { describe, it, expect } from "vitest";
import { toPublicProduct } from "./dto";

describe("toPublicProduct", () => {
  it("sorts images by sortOrder and stringifies dates", () => {
    const now = new Date();
    const dto = toPublicProduct({
      _id: "abc",
      slug: "s",
      name: "n",
      category: "PHONES",
      brand: "iPhone",
      condition: "UK_USED",
      cosmeticGrade: "A",
      priceNaira: 1,
      description: null,
      stockType: "UNIQUE_UNIT",
      status: "AVAILABLE",
      quantity: null,
      isVisible: true,
      specs: [],
      images: [
        { key: "products/b.jpg", sortOrder: 1 },
        { key: "products/a.jpg", sortOrder: 0 },
      ],
      whatsappClickCount: 0,
      instagramClickCount: 0,
      createdAt: now,
      updatedAt: now,
    } as never);
    // sorted by sortOrder, and each bare key resolved to a storage URL
    expect(dto.images[0]!.url).toBe("http://localhost:4000/uploads/products/a.jpg");
    expect(typeof dto.createdAt).toBe("string");
  });
});
