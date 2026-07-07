import type { TCategory, TCondition, TCosmeticGrade } from "./types";

export const CATEGORIES: readonly TCategory[] = [
  "PHONES",
  "LAPTOPS",
  "AUDIO",
  "WEARABLES",
  "CONSOLES",
  "OTHER",
];
export const CONDITIONS: readonly TCondition[] = ["NEW", "UK_USED", "US_USED", "NG_USED"];

export const CATEGORY_LABEL: Record<TCategory, string> = {
  PHONES: "Phones",
  LAPTOPS: "Laptops",
  AUDIO: "Audio",
  WEARABLES: "Wearables",
  CONSOLES: "Consoles",
  OTHER: "Other",
};
export const CONDITION_LABEL: Record<TCondition, string> = {
  NEW: "Brand New",
  UK_USED: "UK Used",
  US_USED: "US Used",
  NG_USED: "Naija Used",
};
export const GRADE_GLOSSARY: Record<TCosmeticGrade, string> = {
  A: "Excellent — little to no visible wear, screen/body near-perfect.",
  B: "Good — light signs of use (minor scuffs), fully functional.",
  C: "Fair — noticeable cosmetic wear, fully functional, priced accordingly.",
};
export const BRANDS_BY_CATEGORY: Record<TCategory, string[]> = {
  PHONES: ["iPhone", "Samsung", "Google Pixel", "Xiaomi"],
  LAPTOPS: ["MacBook", "HP", "Dell", "MSI", "Asus", "Alienware"],
  AUDIO: ["AirPods", "AirPods Pro", "AirPods Max"],
  WEARABLES: ["Apple Watch", "Pixel Watch"],
  CONSOLES: ["PlayStation", "Xbox"],
  OTHER: ["Powerbank", "Starlink"],
};

export const WHATSAPP_NUMBER = "2348060248044";
export const CONTACT = {
  whatsapp: WHATSAPP_NUMBER,
  instagram: "Mo_gadgets",
  facebook: "Mo Gadgets",
  address: "His Grace Plaza, 14 Francis Oremeji Street, Computer Village, Ikeja, Lagos.",
  hours: "Mon–Sat, 9am–6pm",
} as const;
