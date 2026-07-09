"use client";

import type React from "react";
import { useSiteConfig } from "@/components/SiteConfigProvider";
import { instagramLink } from "@/helpers/format";
import { Card, Lead, Page, RowLabel, RowValue, RowWrap, Title, WhatsAppLink } from "./styled";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <RowWrap>
      <RowLabel>{label}</RowLabel>
      <RowValue>{value}</RowValue>
    </RowWrap>
  );
}

export default function ContactWrapper() {
  const { contact } = useSiteConfig();
  return (
    <Page>
      <Title>Visit us</Title>
      <Lead>Come see the gadgets in person, or chat and we'll deliver nationwide.</Lead>

      <Card>
        <Row label="Address" value={contact.address} />
        <Row label="Hours" value={contact.hours} />
        <Row
          label="WhatsApp"
          value={
            <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer">
              Chat on WhatsApp
            </a>
          }
        />
        <Row
          label="Instagram"
          value={
            <a href={instagramLink(contact.instagram)} target="_blank" rel="noopener noreferrer">
              @{contact.instagram}
            </a>
          }
        />
        <Row label="Facebook" value={contact.facebook} />
      </Card>

      <WhatsAppLink
        href={`https://wa.me/${contact.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        💬 Message us on WhatsApp
      </WhatsAppLink>
    </Page>
  );
}
