import type { TCondition, TCosmeticGrade, TStatus, TStockType } from "@mogadget/contracts/types";
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
