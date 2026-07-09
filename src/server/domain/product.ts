import type { TCondition, TCosmeticGrade, TStatus, TStockType } from "@/server/validators/types";
import { ErrInvalidFields } from "../constants/errors";

export interface IProductInvariantInput {
  condition: TCondition;
  cosmeticGrade: TCosmeticGrade | null;
  stockType: TStockType;
  status: TStatus;
  quantity: number | null;
  priceNaira: number;
}

export function deriveStatusFromQuantity(
  quantity: number,
): Extract<TStatus, "IN_STOCK" | "OUT_OF_STOCK"> {
  return quantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK";
}

// System rule: a RESTOCKABLE listing whose stock has hit zero (or below) is auto-hidden from
// the public catalog. Enforced on every write, NOT gated behind the admin visibility toggle /
// products:write action — once stock runs out the listing hides itself immediately. Restocking
// (quantity back above zero) never auto-unhides; re-listing stays a deliberate admin choice.
// Unique (pre-owned) units are unaffected: their sold-out state is expressed as SOLD, not qty.
// Returns the isVisible value to persist (pass the admin-supplied value in).
export function stockAwareVisibility(p: {
  stockType: TStockType;
  quantity: number | null;
  isVisible: boolean;
}): boolean {
  if (p.stockType === "RESTOCKABLE" && typeof p.quantity === "number" && p.quantity <= 0) {
    return false;
  }
  return p.isVisible;
}

export function assertProductInvariants(p: IProductInvariantInput): void {
  const isNew = p.condition === "NEW";
  const restockStatuses: TStatus[] = ["IN_STOCK", "OUT_OF_STOCK"];
  const uniqueStatuses: TStatus[] = ["AVAILABLE", "SOLD"];
  const bad = (): never => {
    throw ErrInvalidFields;
  };
  if (!Number.isInteger(p.priceNaira) || p.priceNaira <= 0) bad();
  if (isNew) {
    if (p.cosmeticGrade !== null) bad();
    if (p.stockType !== "RESTOCKABLE") bad();
    if (!restockStatuses.includes(p.status)) bad();
    if (p.quantity === null || p.quantity < 0) bad();
  } else {
    if (p.cosmeticGrade === null) bad();
    if (p.stockType !== "UNIQUE_UNIT") bad();
    if (!uniqueStatuses.includes(p.status)) bad();
    if (p.quantity !== null) bad();
  }
}
