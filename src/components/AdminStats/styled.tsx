import styled from "styled-components";

export const Strip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
`;

export const StatCard = styled.div`
  background: #fff;
  border: 1px solid rgba(20, 21, 24, 0.1);
  border-radius: 12px;
  padding: 14px 16px;
`;

export const StatValue = styled.div<{ $accent?: string }>`
  font-size: 24px;
  font-weight: 700;
  color: ${(p) => p.$accent ?? "var(--ink)"};
`;

export const StatLabel = styled.div`
  color: var(--sold);
  font: 500 12px var(--font-body);
`;
