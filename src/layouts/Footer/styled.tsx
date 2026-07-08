import Link from "next/link";
import styled, { css } from "styled-components";

export const Foot = styled.footer`
  border-top: 1px solid rgba(20, 21, 24, 0.08);
  margin-top: 48px;
  background: var(--paper);
`;

export const Wrap = styled.div`
  max-width: 1240px;
  margin: 0 auto;
  padding: 32px 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
`;

export const Wordmark = styled.div`
  font: 700 18px var(--font-display);
`;

export const BrandAccent = styled.span`
  color: var(--brand);
`;

export const Col = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const ColHeading = styled.div`
  font: 600 13px var(--font-body);
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const muted = css`
  color: rgba(20, 21, 24, 0.65);
  font-size: 14px;
  line-height: 1.5;
`;

export const MutedText = styled.p`
  ${muted}
`;

/* Inline styles previously pinned the color on hover too (they beat the global
   a:hover rule), so the hover lock preserves the original rendering. */
export const MutedAnchor = styled.a`
  ${muted}

  &:hover {
    color: rgba(20, 21, 24, 0.65);
  }
`;

export const MutedLink = styled(Link)`
  ${muted}

  &:hover {
    color: rgba(20, 21, 24, 0.65);
  }
`;

export const FooterBottom = styled(Wrap)`
  padding-top: 0;
  color: var(--sold);
  font-size: 12px;
`;
