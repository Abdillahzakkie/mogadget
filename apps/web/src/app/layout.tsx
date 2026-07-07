import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "MoGadget — New & UK-used gadgets",
  description: "Graded, tested gadgets in Lagos. Browse, then chat to order.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
