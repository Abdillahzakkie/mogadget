import { z } from "zod";
import {
  categorySchema,
  conditionSchema,
  gradeSchema,
  statusSchema,
  stockTypeSchema,
} from "./common";

const specSchema = z.object({
  label: z.string().trim().min(1),
  value: z.string().trim().min(1),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1),
  category: categorySchema,
  brand: z.string().trim().min(1),
  condition: conditionSchema,
  cosmeticGrade: gradeSchema.nullish(),
  priceNaira: z.number().int().positive(),
  description: z.string().trim().max(2000).nullish(),
  stockType: stockTypeSchema,
  status: statusSchema,
  quantity: z.number().int().nonnegative().nullish(),
  specs: z.array(specSchema).default([]),
  isVisible: z.boolean().default(true),
});
export type TCreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type TUpdateProductInput = z.infer<typeof updateProductSchema>;

export const clickSchema = z.object({ channel: z.enum(["whatsapp", "instagram"]) });
export type TClickInput = z.infer<typeof clickSchema>;

export const uploadSignSchema = z.object({
  contentType: z.string().trim().min(1),
  ext: z.string().trim().max(8).optional().default(""),
});
export type TUploadSignInput = z.infer<typeof uploadSignSchema>;

export const productFilterSchema = z.object({
  category: categorySchema.optional(),
  q: z.string().trim().optional(),
  condition: z.array(conditionSchema).optional(),
  brand: z.array(z.string()).optional(),
  min: z.coerce.number().int().nonnegative().optional(),
  max: z.coerce.number().int().nonnegative().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
});
export type TProductFilter = z.infer<typeof productFilterSchema>;
