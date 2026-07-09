import { z } from "zod";

// WhatsApp numbers are stored digits-only with the country code first (wa.me format). Reject
// leading "+" / spaces at the edge so the link builder never emits a broken deep link.
const whatsappSchema = z
  .string()
  .trim()
  .regex(/^\d{7,15}$/, "WhatsApp must be 7–15 digits, country code first, no + or spaces");

const contactSchema = z.object({
  whatsapp: whatsappSchema,
  instagram: z.string().trim().max(64),
  facebook: z.string().trim().max(120),
  address: z.string().trim().max(240),
  hours: z.string().trim().max(120),
});

const seoSchema = z.object({
  defaultTitle: z.string().trim().min(1).max(120),
  defaultDescription: z.string().trim().max(320),
  ogImageKey: z.string().trim().max(256).optional().default(""),
});

const togglesSchema = z.object({
  maintenanceMode: z.boolean(),
  showSoldListings: z.boolean(),
});

// The full config shape (used for validation of a complete object).
export const siteConfigSchema = z.object({
  businessName: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(160),
  contact: contactSchema,
  seo: seoSchema,
  toggles: togglesSchema,
});
export type TSiteConfigInput = z.infer<typeof siteConfigSchema>;

// PATCH body: every section optional, and each section's fields optional too, so the admin form
// can submit only what changed.
export const siteConfigPatchSchema = z
  .object({
    businessName: z.string().trim().min(1).max(80),
    tagline: z.string().trim().max(160),
    contact: contactSchema.partial(),
    seo: seoSchema.partial(),
    toggles: togglesSchema.partial(),
  })
  .partial();
export type TSiteConfigPatchInput = z.infer<typeof siteConfigPatchSchema>;
