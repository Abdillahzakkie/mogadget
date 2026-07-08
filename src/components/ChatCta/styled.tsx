import styled from "styled-components";

/* Inline styles previously pinned the color on hover too (they beat the global
   a:hover rule), so the hover locks preserve the original rendering. */
export const WhatsAppAnchor = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--whatsapp);
  color: #04310f;
  font: 600 16px var(--font-body);
  padding: 14px 22px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  width: 100%;

  &:hover {
    color: #04310f;
  }
`;

export const InstagramAnchor = styled.a`
  display: inline-block;
  color: var(--ink);
  font: 500 15px var(--font-body);
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover {
    color: var(--ink);
  }
`;
