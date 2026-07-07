import { describe, it, expect } from "vitest";
import { assertProductInvariants, deriveStatusFromQuantity } from "./product";
import { ErrInvalidFields } from "../constants/errors";

const newValid = {
  condition: "NEW",
  cosmeticGrade: null,
  stockType: "RESTOCKABLE",
  status: "IN_STOCK",
  quantity: 5,
  priceNaira: 985000,
} as const;
const usedValid = {
  condition: "UK_USED",
  cosmeticGrade: "A",
  stockType: "UNIQUE_UNIT",
  status: "AVAILABLE",
  quantity: null,
  priceNaira: 485000,
} as const;

describe("assertProductInvariants", () => {
  it("accepts a valid NEW product", () => {
    expect(() => assertProductInvariants(newValid)).not.toThrow();
  });
  it("accepts a valid pre-owned product", () => {
    expect(() => assertProductInvariants(usedValid)).not.toThrow();
  });
  it("rejects NEW with a cosmetic grade", () => {
    expect(() => assertProductInvariants({ ...newValid, cosmeticGrade: "B" })).toThrow(
      ErrInvalidFields.message,
    );
  });
  it("rejects pre-owned with no grade", () => {
    expect(() => assertProductInvariants({ ...usedValid, cosmeticGrade: null })).toThrow();
  });
  it("rejects a UNIQUE_UNIT carrying a quantity", () => {
    expect(() => assertProductInvariants({ ...usedValid, quantity: 1 })).toThrow();
  });
  it("rejects a RESTOCKABLE with an AVAILABLE status", () => {
    expect(() => assertProductInvariants({ ...newValid, status: "AVAILABLE" })).toThrow();
  });
  it("rejects a non-integer price", () => {
    expect(() => assertProductInvariants({ ...newValid, priceNaira: 10.5 })).toThrow();
  });
});

describe("deriveStatusFromQuantity", () => {
  it("maps 0 → OUT_OF_STOCK and >0 → IN_STOCK", () => {
    expect(deriveStatusFromQuantity(0)).toBe("OUT_OF_STOCK");
    expect(deriveStatusFromQuantity(3)).toBe("IN_STOCK");
  });
});
