export interface ISiteContact {
  whatsapp: string; // digits only, country code first (wa.me format)
  instagram: string; // handle without leading @
  facebook: string;
  address: string;
  hours: string;
}
export interface ISiteSeo {
  defaultTitle: string;
  defaultDescription: string;
  ogImageKey?: string;
}
export interface ISiteToggles {
  // When true the public site shows a maintenance screen; /admin stays reachable.
  maintenanceMode: boolean;
  // When true, SOLD pre-owned listings remain publicly visible (greyed out); when false they
  // are hidden from the public catalog.
  showSoldListings: boolean;
}
export interface ISiteConfig {
  businessName: string;
  tagline: string;
  contact: ISiteContact;
  seo: ISiteSeo;
  toggles: ISiteToggles;
  updatedAt?: Date;
}

// A patch from the admin form: any top-level field optional, and each nested section
// independently partial, so a PATCH can touch a single field (e.g. `contact.whatsapp`).
export interface ISiteConfigPatch {
  businessName?: string;
  tagline?: string;
  contact?: Partial<ISiteContact>;
  seo?: Partial<ISiteSeo>;
  toggles?: Partial<ISiteToggles>;
}
