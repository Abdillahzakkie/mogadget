import styled from "styled-components";

export const Strip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
`;

export const StatCard = styled.div`
  min-width: 0; /* allow grid items to shrink so long values wrap instead of overflowing */
  background: #fff;
  border: 1px solid rgba(20, 21, 24, 0.1);
  border-radius: 12px;
  padding: 14px 16px;
`;

export const StatValue = styled.div<{ $accent?: string }>`
  font-size: 20px;
  line-height: 1.2;
  font-weight: 700;
  overflow-wrap: anywhere; /* wide money values (e.g. inventory value) never clip past the card */
  color: ${(p) => p.$accent ?? "var(--ink)"};
`;

export const StatLabel = styled.div`
  color: var(--sold);
  font: 500 12px var(--font-body);
`;
