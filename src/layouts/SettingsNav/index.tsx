"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMe } from "@/hooks/Settings/useMe";
import { visibleSections } from "@/lib/settingsNav";
import { Content, Nav, NavItem, Shell } from "./styled";

// Two-column settings chrome: a permission-filtered left nav + the active section on the right.
// While /admin/me loads we render an empty nav rather than flashing links the user can't use.
export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { me } = useMe();
  const sections = visibleSections(me?.permissions ?? []);

  return (
    <Shell>
      <Nav aria-label="Settings sections">
        {sections.map((s) => (
          <NavItem key={s.key} href={s.href} $active={pathname === s.href}>
            {s.label}
          </NavItem>
        ))}
      </Nav>
      <Content>{children}</Content>
    </Shell>
  );
}
