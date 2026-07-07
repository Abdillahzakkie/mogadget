import type { ReactNode } from "react";
import { AdminHeader } from "../../../components/AdminHeader";

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <AdminHeader />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px" }}>{children}</div>
    </div>
  );
}
