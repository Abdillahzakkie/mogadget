import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";
import { SiteConfigProvider } from "@/components/SiteConfigProvider";
import { TrustStrip } from "@/components/TrustStrip";
import { Footer } from "@/layouts/Footer";
import { Navbar } from "@/layouts/Navbar";
import { SiteMain } from "@/layouts/Shells";
import { services } from "@/server";

// The public shell reads the live, editable site config (contact channels, SEO, and the
// maintenance gate) on every request. Rendering dynamically — against the Redis-cached config,
// so it stays cheap — means an admin's save takes effect on the very next page load instead of
// waiting for an ISR revalidation window. Product data keeps its own service-level caching.
export const dynamic = "force-dynamic";

// Public SEO defaults come from the editable site config, falling back to the seeded defaults.
export async function generateMetadata(): Promise<Metadata> {
  const cfg = await services.siteConfig.getSiteConfig();
  return {
    title: cfg.seo.defaultTitle,
    description: cfg.seo.defaultDescription,
    openGraph: {
      type: "website",
      siteName: cfg.businessName,
      title: cfg.seo.defaultTitle,
      description: cfg.seo.defaultDescription,
    },
  };
}

// Shared chrome for every public page (home, catalog, product, contact). Admin lives
// outside this route group so it keeps its own header and stays free of the trust strip.
// The resolved site config is provided to client components here; maintenance mode short-
// circuits the public site (admin, in a separate route group, stays reachable).
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const config = await services.siteConfig.getSiteConfig();

  if (config.toggles.maintenanceMode) {
    return (
      <SiteConfigProvider config={config}>
        <MaintenanceScreen />
      </SiteConfigProvider>
    );
  }

  return (
    <SiteConfigProvider config={config}>
      <TrustStrip />
      <Navbar />
      <SiteMain>{children}</SiteMain>
      <Footer />
    </SiteConfigProvider>
  );
}
