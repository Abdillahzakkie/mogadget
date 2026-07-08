import type { ReactNode } from "react";
import { TrustStrip } from "@/components/TrustStrip";
import { Footer } from "@/layouts/Footer";
import { Navbar } from "@/layouts/Navbar";
import { SiteMain } from "@/layouts/Shells";

// Shared chrome for every public page (home, catalog, product, contact). Admin lives
// outside this route group so it keeps its own header and stays free of the trust strip.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TrustStrip />
      <Navbar />
      <SiteMain>{children}</SiteMain>
      <Footer />
    </>
  );
}
