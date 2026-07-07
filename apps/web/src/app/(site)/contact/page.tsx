import type { Metadata } from "next";
import { CONTACT } from "@mogadget/contracts/constants";
import { instagramLink } from "../../../helpers/format";

export const metadata: Metadata = {
  title: "Visit us — MoGadget",
  description:
    "MoGadget is in Computer Village, Ikeja, Lagos. Store hours, WhatsApp, and Instagram. Nationwide delivery.",
};

export default function ContactPage() {
  return (
    <div style={{ padding: "36px 0", maxWidth: 640 }}>
      <h1 style={{ font: "600 32px var(--font-display)", margin: "0 0 8px" }}>Visit us</h1>
      <p style={{ color: "rgba(20,21,24,.65)", marginTop: 0 }}>
        Come see the gadgets in person, or chat and we'll deliver nationwide.
      </p>

      <div style={card}>
        <Row label="Address" value={CONTACT.address} />
        <Row label="Hours" value={CONTACT.hours} />
        <Row
          label="WhatsApp"
          value={
            <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer">
              Chat on WhatsApp
            </a>
          }
        />
        <Row
          label="Instagram"
          value={
            <a href={instagramLink(CONTACT.instagram)} target="_blank" rel="noopener noreferrer">
              @{CONTACT.instagram}
            </a>
          }
        />
        <Row label="Facebook" value={CONTACT.facebook} />
      </div>

      <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer" style={waBtn}>
        💬 Message us on WhatsApp
      </a>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={row}>
      <div style={{ color: "var(--sold)", font: "500 13px var(--font-body)", minWidth: 100 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

const card = {
  marginTop: 20,
  border: "1px solid rgba(20,21,24,.1)",
  borderRadius: 14,
  overflow: "hidden",
};
const row = {
  display: "flex",
  gap: 16,
  padding: "14px 18px",
  borderBottom: "1px solid rgba(20,21,24,.07)",
};
const waBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  marginTop: 22,
  background: "var(--whatsapp)",
  color: "#04310f",
  font: "600 16px var(--font-body)",
  padding: "13px 22px",
  borderRadius: 12,
};
