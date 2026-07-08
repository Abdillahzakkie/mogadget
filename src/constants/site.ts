// Canonical public origin — used for WhatsApp deep links, OpenGraph/canonical URLs,
// sitemap, and robots. NEXT_PUBLIC_* so it is inlined for client components too.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export { CONTACT, WHATSAPP_NUMBER } from "@/server/validators/constants";
