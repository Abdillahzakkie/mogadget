import { WHATSAPP_NUMBER } from "@mogadget/contracts/constants";
import { formatNaira } from "./naira";

export function buildWhatsAppLink(p: { name: string; priceNaira: number; url?: string }): string {
  const base = `Hi, I'm interested in the ${p.name} (${formatNaira(p.priceNaira)}) listed on MoGadget`;
  const msg = p.url ? `${base} — ${p.url}` : base;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}
