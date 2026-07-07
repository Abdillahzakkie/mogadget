import Link from "next/link";
import { routes } from "../../constants/routes";

// Public site chrome: wordmark + primary nav. Server component (no interactivity).
export function SiteHeader() {
  return (
    <header style={bar}>
      <div style={wrap}>
        <Link href={routes.home} style={{ font: "700 22px var(--font-display)", color: "var(--ink)" }}>
          Mo<span style={{ color: "var(--brand)" }}>Gadget</span>
        </Link>
        <nav style={nav}>
          <Link href={routes.catalog} style={link}>
            Shop
          </Link>
          <Link href={routes.contact} style={link}>
            Visit us
          </Link>
        </nav>
      </div>
    </header>
  );
}

const bar = { borderBottom: "1px solid rgba(20,21,24,.08)", background: "var(--paper)" };
const wrap = {
  maxWidth: 1240,
  margin: "0 auto",
  padding: "14px 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
};
const nav = { display: "flex", gap: 22, alignItems: "center" };
const link = { color: "var(--ink)", font: "500 15px var(--font-body)" };
