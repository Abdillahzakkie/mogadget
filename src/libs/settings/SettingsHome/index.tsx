"use client";

import { useMe } from "@/hooks/Settings/useMe";
import { visibleSections } from "@/lib/settingsNav";
import {
  HomeCard,
  HomeCardDesc,
  HomeCardTitle,
  HomeGrid,
  SectionLead,
  SectionTitle,
} from "../styled";

export default function SettingsHome() {
  const { me } = useMe();
  const sections = visibleSections(me?.permissions ?? []).filter((s) => s.key !== "profile");

  return (
    <>
      <SectionTitle>Settings</SectionTitle>
      <SectionLead>
        {me ? `Signed in as ${me.username}.` : "Loading your account…"} Manage your account, the
        public site, and access control.
      </SectionLead>
      <HomeGrid>
        {sections.map((s) => (
          <HomeCard key={s.key} href={s.href}>
            <HomeCardTitle>{s.label}</HomeCardTitle>
            <HomeCardDesc>{s.description}</HomeCardDesc>
          </HomeCard>
        ))}
      </HomeGrid>
    </>
  );
}
