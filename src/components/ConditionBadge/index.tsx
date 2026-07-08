"use client";
import { CONDITION_LABEL } from "@/server/validators/constants";
import type { TCondition, TCosmeticGrade, TStatus } from "@/server/validators/types";
import { Badge } from "./styled";

// Signature trust badge (spec §9): solid-green pill for BRAND NEW, amber-outlined
// "UK USED · A" for graded pre-owned, grey when SOLD.
export function ConditionBadge({
  condition,
  cosmeticGrade,
  status,
}: {
  condition: TCondition;
  cosmeticGrade: TCosmeticGrade | null;
  status: TStatus;
}) {
  if (status === "SOLD") {
    const base = CONDITION_LABEL[condition].toUpperCase();
    return <Badge $variant="sold">{base} · SOLD</Badge>;
  }
  if (condition === "NEW") {
    return <Badge $variant="new">BRAND NEW</Badge>;
  }
  const label = `${CONDITION_LABEL[condition]}${cosmeticGrade ? ` · ${cosmeticGrade}` : ""}`;
  return <Badge $variant="used">{label.toUpperCase()}</Badge>;
}
