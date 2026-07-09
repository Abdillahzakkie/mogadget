import type { ISiteConfig, ISiteConfigPatch } from "../../models/siteConfig/types";
import { CONTACT, WHATSAPP_NUMBER } from "../../validators/constants";

// The compile-time fallback: what the public site showed before site config became editable.
// A cold database (no stored row) resolves to exactly these values, so the site never renders
// blank contact details, and a partially-filled stored row is completed from here.
export const SITE_CONFIG_DEFAULTS: ISiteConfig = {
  businessName: "MoGadget",
  tagline: "New & pre-owned gadgets, delivered nationwide.",
  contact: {
    whatsapp: WHATSAPP_NUMBER,
    instagram: CONTACT.instagram,
    facebook: CONTACT.facebook,
    address: CONTACT.address,
    hours: CONTACT.hours,
  },
  seo: {
    defaultTitle: "MoGadget — New & Pre-owned Gadgets in Lagos",
    defaultDescription:
      "Browse new and pre-owned phones, laptops, audio and more. Chat on WhatsApp to order.",
    ogImageKey: "",
  },
  toggles: {
    maintenanceMode: false,
    showSoldListings: true,
  },
};

// Deep-merge a (possibly partial or null) stored row over the defaults so callers always get a
// complete, fully-typed config. Nested sections merge field-by-field; a missing section falls
// back whole. Empty strings from the DB are treated as "set" (the admin may intentionally clear
// a field) — only `undefined`/`null` falls through to a default.
export function mergeWithDefaults(stored: Partial<ISiteConfig> | null | undefined): ISiteConfig {
  const s = stored ?? {};
  return {
    businessName: s.businessName ?? SITE_CONFIG_DEFAULTS.businessName,
    tagline: s.tagline ?? SITE_CONFIG_DEFAULTS.tagline,
    contact: { ...SITE_CONFIG_DEFAULTS.contact, ...(s.contact ?? {}) },
    seo: { ...SITE_CONFIG_DEFAULTS.seo, ...(s.seo ?? {}) },
    toggles: { ...SITE_CONFIG_DEFAULTS.toggles, ...(s.toggles ?? {}) },
    updatedAt: s.updatedAt,
  };
}

// Apply a patch (from the admin form) onto a complete current config, section by section, so a
// PATCH touching only `contact.whatsapp` leaves every other field intact.
export function applyConfigPatch(current: ISiteConfig, patch: ISiteConfigPatch): ISiteConfig {
  return {
    businessName: patch.businessName ?? current.businessName,
    tagline: patch.tagline ?? current.tagline,
    contact: { ...current.contact, ...(patch.contact ?? {}) },
    seo: { ...current.seo, ...(patch.seo ?? {}) },
    toggles: { ...current.toggles, ...(patch.toggles ?? {}) },
  };
}
