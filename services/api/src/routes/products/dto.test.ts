import { describe, it, expect } from "vitest";
import { toPublicProduct, toAdminProduct } from "./dto";

const base = {
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
  isVisible: false,
  specs: [],
  images: [
    { key: "products/b.jpg", sortOrder: 1 },
    { key: "products/a.jpg", sortOrder: 0 },
  ],
  whatsappClickCount: 3,
  instagramClickCount: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
} as const;

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

  it("omits the visibility flag and storage keys from the public DTO", () => {
    const dto = toPublicProduct(base as never);
    expect("isVisible" in dto).toBe(false);
    expect("key" in dto.images[0]!).toBe(false);
  });
});

describe("toAdminProduct", () => {
  it("adds visibility + image storage keys and keeps sortOrder", () => {
    const dto = toAdminProduct(base as never);
    expect(dto.isVisible).toBe(false);
    // images sorted by sortOrder, each carrying both key and resolved url
    expect(dto.images[0]!.key).toBe("products/a.jpg");
    expect(dto.images[0]!.url).toBe("http://localhost:4000/uploads/products/a.jpg");
    expect(dto.images[1]!.key).toBe("products/b.jpg");
    expect(dto.whatsappClickCount).toBe(3);
  });
});
