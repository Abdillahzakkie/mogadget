"use client";
import type { CSSProperties } from "react";
import { CONTACT } from "@mogadget/contracts/constants";
import { whatsappLink, instagramLink } from "../../helpers/format";
import { SITE_URL } from "../../constants/site";
import { fireClickBeacon } from "../../lib/beacon";

interface ChatProduct {
  slug: string;
  name: string;
  priceNaira: number;
}

// The single reserved-green WhatsApp CTA (spec §9: exactly one per screen). Fires the
// click beacon synchronously BEFORE the browser follows the wa.me deep link, so the
// analytics count survives navigation.
export function WhatsAppButton({
  product,
  label = "Chat on WhatsApp to order",
  style,
}: {
  product: ChatProduct;
  label?: string;
  style?: CSSProperties;
}) {
  const href = whatsappLink({
    phone: CONTACT.whatsapp,
    name: product.name,
    priceNaira: product.priceNaira,
    slug: product.slug,
    siteUrl: SITE_URL,
  });
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => fireClickBeacon(product.slug, "whatsapp")}
      style={{ ...waBtn, ...style }}
    >
      <span aria-hidden>{"💬"}</span>
      {label}
    </a>
  );
}

// Secondary Instagram link (neutral styling — the green is reserved for WhatsApp).
export function InstagramCta({ product }: { product: ChatProduct }) {
  return (
    <a
      href={instagramLink(CONTACT.instagram)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => fireClickBeacon(product.slug, "instagram")}
      style={igBtn}
    >
      Or message us on Instagram
    </a>
  );
}

const waBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: "var(--whatsapp)",
  color: "#04310f",
  font: "600 16px var(--font-body)",
  padding: "14px 22px",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  width: "100%",
};
const igBtn: CSSProperties = {
  display: "inline-block",
  color: "var(--ink)",
  font: "500 15px var(--font-body)",
  textDecoration: "underline",
  textUnderlineOffset: 3,
};
