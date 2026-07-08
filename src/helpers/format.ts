export function formatNaira(n: number): string {
  return `₦${Math.trunc(n).toLocaleString("en-US")}`;
}

// Prefilled WhatsApp enquiry text. Includes the product name, firm price, and the
// canonical product URL so the owner sees exactly which unit the buyer means and the
// chat shows a rich link preview (spec §12.2, confirmed with owner 2026-07-07).
export function whatsappMessage(input: {
  name: string;
  priceNaira: number;
  slug: string;
  siteUrl: string;
}): string {
  const url = `${input.siteUrl.replace(/\/$/, "")}/products/${input.slug}`;
  return `Hi MoGadget! I'm interested in the ${input.name} (${formatNaira(input.priceNaira)}) on MoGadget — ${url}`;
}

// wa.me deep link with the prefilled enquiry. `phone` is digits-only, country code first.
export function whatsappLink(input: {
  phone: string;
  name: string;
  priceNaira: number;
  slug: string;
  siteUrl: string;
}): string {
  const text = encodeURIComponent(whatsappMessage(input));
  return `https://wa.me/${input.phone}?text=${text}`;
}

export function instagramLink(handle: string): string {
  return `https://instagram.com/${handle.replace(/^@/, "")}`;
}
