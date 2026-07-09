"use client";

import styled from "styled-components";
import { useSiteConfig } from "@/components/SiteConfigProvider";

const Wrap = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  text-align: center;
`;
const Card = styled.div`
  max-width: 460px;
`;
const Wordmark = styled.div`
  font: 700 32px var(--font-display);
  margin-bottom: 12px;
`;
const Accent = styled.span`
  color: var(--brand);
`;
const Message = styled.p`
  color: var(--sold);
  font-size: 15px;
  line-height: 1.6;
`;
const WhatsApp = styled.a`
  display: inline-flex;
  margin-top: 20px;
  height: 44px;
  align-items: center;
  padding: 0 20px;
  border-radius: 10px;
  background: var(--whatsapp, #0b7a3e);
  color: #fff;
  font: 600 14px var(--font-body);

  &:hover {
    color: #fff;
  }
`;

// Rendered in place of the public site when the owner flips the maintenance toggle. Contact
// details still come from the live config so buyers can reach the shop while the site is down.
export function MaintenanceScreen() {
  const cfg = useSiteConfig();
  return (
    <Wrap>
      <Card>
        <Wordmark>
          {cfg.businessName.replace(/gadget/i, "")}
          <Accent>Gadget</Accent>
        </Wordmark>
        <Message>
          We're briefly down for maintenance and will be back shortly. In the meantime, you can
          still reach us on WhatsApp to browse or order.
        </Message>
        {cfg.contact.whatsapp && (
          <WhatsApp
            href={`https://wa.me/${cfg.contact.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            💬 Chat on WhatsApp
          </WhatsApp>
        )}
      </Card>
    </Wrap>
  );
}
