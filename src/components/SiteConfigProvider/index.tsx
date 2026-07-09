"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { ISiteConfig } from "@/server/models/siteConfig/types";

// Client-side access to the live site config. The server `(site)` layout resolves the config
// (Redis → DB → defaults) and hands the plain object to this provider, so client components
// (footer, chat CTAs, contact page) render editable contact details without importing any
// server-only module. Importing only the *type* keeps mongoose/redis out of the client bundle.
const SiteConfigContext = createContext<ISiteConfig | null>(null);

export function SiteConfigProvider({
  config,
  children,
}: {
  config: ISiteConfig;
  children: ReactNode;
}) {
  return <SiteConfigContext.Provider value={config}>{children}</SiteConfigContext.Provider>;
}

// Throws if used outside the provider — a loud failure beats silently rendering blank contact
// details. Every public page is wrapped by the `(site)` layout, so this always has a value there.
export function useSiteConfig(): ISiteConfig {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error("useSiteConfig must be used within a SiteConfigProvider");
  return ctx;
}
