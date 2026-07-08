import type { Metadata } from "next";
import ContactWrapper from "@/libs/ContactWrapper";

export const metadata: Metadata = {
  title: "Visit us — MoGadget",
  description:
    "MoGadget is in Computer Village, Ikeja, Lagos. Store hours, WhatsApp, and Instagram. Nationwide delivery.",
};

export default function ContactPage() {
  return <ContactWrapper />;
}
