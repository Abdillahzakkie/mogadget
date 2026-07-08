import type { ReactNode } from "react";
import { AdminHeader } from "@/layouts/AdminHeader";
import { PanelContainer, PanelRoot } from "@/layouts/Shells";

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <PanelRoot>
      <AdminHeader />
      <PanelContainer>{children}</PanelContainer>
    </PanelRoot>
  );
}
