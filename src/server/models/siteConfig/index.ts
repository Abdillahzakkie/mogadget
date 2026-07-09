import mongoose, { type Model } from "mongoose";
import type { ISiteConfig } from "./types";

// Single-document collection: every read/write targets the one row keyed "site". The unique
// `key` index makes the singleton invariant a database constraint, not a convention.
export const SINGLETON_KEY = "site";

const ContactSchema = new mongoose.Schema(
  {
    whatsapp: { type: String, default: "" },
    instagram: { type: String, default: "" },
    facebook: { type: String, default: "" },
    address: { type: String, default: "" },
    hours: { type: String, default: "" },
  },
  { _id: false },
);
const SeoSchema = new mongoose.Schema(
  {
    defaultTitle: { type: String, default: "" },
    defaultDescription: { type: String, default: "" },
    ogImageKey: { type: String, default: "" },
  },
  { _id: false },
);
const TogglesSchema = new mongoose.Schema(
  {
    maintenanceMode: { type: Boolean, default: false },
    showSoldListings: { type: Boolean, default: true },
  },
  { _id: false },
);
const SiteConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: SINGLETON_KEY },
    businessName: { type: String, default: "" },
    tagline: { type: String, default: "" },
    contact: { type: ContactSchema, default: () => ({}) },
    seo: { type: SeoSchema, default: () => ({}) },
    toggles: { type: TogglesSchema, default: () => ({}) },
  },
  { timestamps: true, collection: "site_config" },
);

export const SiteConfig: Model<ISiteConfig> =
  (mongoose.models.SiteConfig as Model<ISiteConfig>) ||
  mongoose.model<ISiteConfig>("SiteConfig", SiteConfigSchema);

export async function getSiteConfigDB(): Promise<ISiteConfig | null> {
  try {
    return await SiteConfig.findOne({ key: SINGLETON_KEY }).lean<ISiteConfig>();
  } catch {
    return null;
  }
}

export async function upsertSiteConfigDB(doc: ISiteConfig): Promise<ISiteConfig | null> {
  try {
    return await SiteConfig.findOneAndUpdate(
      { key: SINGLETON_KEY },
      { $set: { ...doc, key: SINGLETON_KEY } },
      { returnDocument: "after", upsert: true },
    ).lean<ISiteConfig>();
  } catch {
    return null;
  }
}

export default SiteConfig;
export * from "./types";
