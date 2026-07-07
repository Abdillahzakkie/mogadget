import { CONDITION_LABEL } from "@mogadget/contracts/constants";
import type { TCondition, TCosmeticGrade, TStatus } from "@mogadget/contracts/types";

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
    return <span style={{ ...badge, ...sold }}>{base} · SOLD</span>;
  }
  if (condition === "NEW") {
    return <span style={{ ...badge, ...brandNew }}>BRAND NEW</span>;
  }
  const label = `${CONDITION_LABEL[condition]}${cosmeticGrade ? ` · ${cosmeticGrade}` : ""}`;
  return <span style={{ ...badge, ...used }}>{label.toUpperCase()}</span>;
}

const badge = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 999,
  font: "600 10px var(--font-body)",
  letterSpacing: ".07em",
  whiteSpace: "nowrap" as const,
};
const brandNew = { background: "var(--brand)", color: "#fff" };
const used = { border: "1.5px solid var(--amber)", color: "var(--amber-text)" };
const sold = { border: "1.5px solid var(--sold)", color: "var(--sold)" };
