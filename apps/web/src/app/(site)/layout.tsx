import type { ReactNode } from "react";
import { TrustStrip } from "../../components/TrustStrip";
import { SiteHeader } from "../../components/SiteHeader";
import { Footer } from "../../components/Footer";

// Shared chrome for every public page (home, catalog, product, contact). Admin lives
// outside this route group so it keeps its own header and stays free of the trust strip.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TrustStrip />
      <SiteHeader />
      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "0 20px", minHeight: "60vh" }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
