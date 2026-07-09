"use client";
import type { CSSProperties } from "react";
import { useSiteConfig } from "@/components/SiteConfigProvider";
import { SITE_URL } from "../../constants/site";
import { instagramLink, whatsappLink } from "../../helpers/format";
import { fireClickBeacon } from "../../lib/beacon";
import { InstagramAnchor, WhatsAppAnchor } from "./styled";

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
  const { contact } = useSiteConfig();
  const href = whatsappLink({
    phone: contact.whatsapp,
    name: product.name,
    priceNaira: product.priceNaira,
    slug: product.slug,
    siteUrl: SITE_URL,
  });
  return (
    <WhatsAppAnchor
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => fireClickBeacon(product.slug, "whatsapp")}
      style={style}
    >
      <span aria-hidden>{"💬"}</span>
      {label}
    </WhatsAppAnchor>
  );
}

// Secondary Instagram link (neutral styling — the green is reserved for WhatsApp).
export function InstagramCta({ product }: { product: ChatProduct }) {
  const { contact } = useSiteConfig();
  return (
    <InstagramAnchor
      href={instagramLink(contact.instagram)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => fireClickBeacon(product.slug, "instagram")}
    >
      Or message us on Instagram
    </InstagramAnchor>
  );
}
