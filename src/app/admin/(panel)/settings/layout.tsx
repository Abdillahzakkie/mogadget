import type { ReactNode } from "react";
import { SettingsShell } from "@/layouts/SettingsNav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>;
}
