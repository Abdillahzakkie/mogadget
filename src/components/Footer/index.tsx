import Link from "next/link";
import { CONTACT } from "@/server/validators/constants";
import { routes } from "../../constants/routes";
import { instagramLink } from "../../helpers/format";

// Public footer: store address, hours, and social handles (spec §9 / contact screen 1d).
export function Footer() {
  return (
    <footer style={foot}>
      <div style={wrap}>
        <div>
          <div style={{ font: "700 18px var(--font-display)" }}>
            Mo<span style={{ color: "var(--brand)" }}>Gadget</span>
          </div>
          <p style={muted}>
            New &amp; pre-owned gadgets, graded and tested. Browse, then chat to order.
          </p>
        </div>
        <div style={col}>
          <div style={h}>Visit us</div>
          <p style={muted}>{CONTACT.address}</p>
          <p style={muted}>{CONTACT.hours}</p>
        </div>
        <div style={col}>
          <div style={h}>Chat</div>
          <a style={muted} href={`https://wa.me/${CONTACT.whatsapp}`}>
            WhatsApp
          </a>
          <a style={muted} href={instagramLink(CONTACT.instagram)}>
            Instagram @{CONTACT.instagram}
          </a>
          <Link style={muted} href={routes.contact}>
            All contact details
          </Link>
        </div>
      </div>
      <div style={{ ...wrap, paddingTop: 0, color: "var(--sold)", fontSize: 12 }}>
        © {new Date().getFullYear()} MoGadget · Not a marketplace — browse and chat to order.
      </div>
    </footer>
  );
}

const foot = {
  borderTop: "1px solid rgba(20,21,24,.08)",
  marginTop: 48,
  background: "var(--paper)",
};
const wrap = {
  maxWidth: 1240,
  margin: "0 auto",
  padding: "32px 20px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 24,
};
const col = { display: "flex", flexDirection: "column" as const, gap: 6 };
const h = {
  font: "600 13px var(--font-body)",
  letterSpacing: ".06em",
  textTransform: "uppercase" as const,
};
const muted = { color: "rgba(20,21,24,.65)", fontSize: 14, lineHeight: 1.5 };
