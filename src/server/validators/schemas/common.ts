import { z } from "zod";

export const categorySchema = z.enum([
  "PHONES",
  "LAPTOPS",
  "AUDIO",
  "WEARABLES",
  "CONSOLES",
  "OTHER",
]);
export const conditionSchema = z.enum(["NEW", "UK_USED", "US_USED", "NG_USED"]);
export const gradeSchema = z.enum(["A", "B", "C"]);
export const statusSchema = z.enum(["IN_STOCK", "OUT_OF_STOCK", "AVAILABLE", "SOLD"]);
export const stockTypeSchema = z.enum(["RESTOCKABLE", "UNIQUE_UNIT"]);
