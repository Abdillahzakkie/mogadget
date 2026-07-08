import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { ReactNode } from "react";
import StyledComponentsRegistry from "@/components/StyledComponentsRegistry";
import { SITE_URL } from "@/constants/site";
import { GlobalStyle } from "@/styles/global";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MoGadget — New & UK-used gadgets in Lagos",
    template: "%s",
  },
  description:
    "Graded, tested new & pre-owned phones, laptops, audio and consoles in Lagos. Real photos, firm prices, 1-month warranty. Browse, then chat to order.",
  openGraph: {
    type: "website",
    siteName: "MoGadget",
    url: SITE_URL,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Instrument+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <StyledComponentsRegistry>
          <GlobalStyle />
          <NextTopLoader color="#0b7a3e" showSpinner={false} />
          {children}
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
