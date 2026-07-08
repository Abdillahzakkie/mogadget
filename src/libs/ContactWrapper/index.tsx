"use client";

import type React from "react";
import { instagramLink } from "@/helpers/format";
import { CONTACT } from "@/server/validators/constants";
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
  return (
    <Page>
      <Title>Visit us</Title>
      <Lead>Come see the gadgets in person, or chat and we'll deliver nationwide.</Lead>

      <Card>
        <Row label="Address" value={CONTACT.address} />
        <Row label="Hours" value={CONTACT.hours} />
        <Row
          label="WhatsApp"
          value={
            <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer">
              Chat on WhatsApp
            </a>
          }
        />
        <Row
          label="Instagram"
          value={
            <a href={instagramLink(CONTACT.instagram)} target="_blank" rel="noopener noreferrer">
              @{CONTACT.instagram}
            </a>
          }
        />
        <Row label="Facebook" value={CONTACT.facebook} />
      </Card>

      <WhatsAppLink
        href={`https://wa.me/${CONTACT.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        💬 Message us on WhatsApp
      </WhatsAppLink>
    </Page>
  );
}
