"use client";

import { AdminAnalytics } from "@/components/AdminAnalytics";
import { AdminStats } from "@/components/AdminStats";
import { SectionLead, SectionTitle } from "../styled";

// Dedicated analytics view. Reuses the same self-fetching stat/analytics components as the
// dashboard summary, so the two never drift.
export default function AnalyticsWrapper() {
  return (
    <>
      <SectionTitle>Analytics</SectionTitle>
      <SectionLead>Click trends across WhatsApp and Instagram, and catalog health.</SectionLead>
      <AdminStats />
      <AdminAnalytics />
    </>
  );
}
