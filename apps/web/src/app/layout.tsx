import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { SITE_URL } from "../constants/site";

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
      <body>{children}</body>
    </html>
  );
}
