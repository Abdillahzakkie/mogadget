import styled from "styled-components";

export const Page = styled.div`
  padding: 36px 0;
  max-width: 640px;
`;

export const Title = styled.h1`
  font: 600 32px var(--font-display);
  margin: 0 0 8px;
`;

export const Lead = styled.p`
  color: rgba(20, 21, 24, 0.65);
  margin-top: 0;
`;

export const Card = styled.div`
  margin-top: 20px;
  border: 1px solid rgba(20, 21, 24, 0.1);
  border-radius: 14px;
  overflow: hidden;
`;

export const RowWrap = styled.div`
  display: flex;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(20, 21, 24, 0.07);
`;

export const RowLabel = styled.div`
  color: var(--sold);
  font: 500 13px var(--font-body);
  min-width: 100px;
`;

export const RowValue = styled.div`
  font-size: 15px;
  line-height: 1.5;
`;

export const WhatsAppLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
  background: var(--whatsapp);
  color: #04310f;
  font: 600 16px var(--font-body);
  padding: 13px 22px;
  border-radius: 12px;

  /* Inline styles used to pin the color through :hover; keep that behavior. */
  &:hover {
    color: #04310f;
  }
`;
