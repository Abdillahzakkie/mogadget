"use client";
import { CONTACT } from "@/server/validators/constants";
import { routes } from "../../constants/routes";
import { instagramLink } from "../../helpers/format";
import {
  BrandAccent,
  Col,
  ColHeading,
  Foot,
  FooterBottom,
  MutedAnchor,
  MutedLink,
  MutedText,
  Wordmark,
  Wrap,
} from "./styled";

// Public footer: store address, hours, and social handles (spec §9 / contact screen 1d).
export function Footer() {
  return (
    <Foot>
      <Wrap>
        <div>
          <Wordmark>
            Mo<BrandAccent>Gadget</BrandAccent>
          </Wordmark>
          <MutedText>
            New &amp; pre-owned gadgets, graded and tested. Browse, then chat to order.
          </MutedText>
        </div>
        <Col>
          <ColHeading>Visit us</ColHeading>
          <MutedText>{CONTACT.address}</MutedText>
          <MutedText>{CONTACT.hours}</MutedText>
        </Col>
        <Col>
          <ColHeading>Chat</ColHeading>
          <MutedAnchor href={`https://wa.me/${CONTACT.whatsapp}`}>WhatsApp</MutedAnchor>
          <MutedAnchor href={instagramLink(CONTACT.instagram)}>
            Instagram @{CONTACT.instagram}
          </MutedAnchor>
          <MutedLink href={routes.contact}>All contact details</MutedLink>
        </Col>
      </Wrap>
      <FooterBottom>
        © {new Date().getFullYear()} MoGadget · Not a marketplace — browse and chat to order.
      </FooterBottom>
    </Foot>
  );
}
