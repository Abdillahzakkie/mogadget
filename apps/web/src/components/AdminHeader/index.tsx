"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi } from "../../lib/adminApi";
import { routes } from "../../constants/routes";

export function AdminHeader() {
  const router = useRouter();

  async function logout() {
    try {
      await adminApi.logout();
    } finally {
      router.replace(routes.adminLogin);
      router.refresh();
    }
  }

  return (
    <header style={bar}>
      <Link href={routes.admin} style={{ font: "700 20px var(--font-display)", color: "var(--ink)" }}>
        Mo<span style={{ color: "var(--brand)" }}>Gadget</span>
        <span style={{ font: "500 12px var(--font-body)", color: "var(--sold)", marginLeft: 8 }}>
          admin
        </span>
      </Link>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Link href={routes.adminNew} style={newBtn}>
          + New listing
        </Link>
        <button type="button" onClick={logout} style={logoutBtn}>
          Log out
        </button>
      </div>
    </header>
  );
}

const bar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 24px",
  borderBottom: "1px solid rgba(20,21,24,.10)",
  background: "#fff",
};
const newBtn = {
  height: 38,
  display: "inline-flex",
  alignItems: "center",
  padding: "0 14px",
  borderRadius: 9,
  background: "var(--brand)",
  color: "#fff",
  font: "600 13px var(--font-body)",
};
const logoutBtn = {
  height: 38,
  padding: "0 14px",
  borderRadius: 9,
  border: "1px solid rgba(20,21,24,.18)",
  background: "transparent",
  color: "var(--ink)",
  font: "600 13px var(--font-body)",
  cursor: "pointer",
};
