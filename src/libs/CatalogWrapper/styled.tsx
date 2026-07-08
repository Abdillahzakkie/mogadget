import styled from "styled-components";

export const PageHead = styled.div`
  padding: 28px 0 4px;
`;

export const PageTitle = styled.h1`
  font: 600 30px var(--font-display);
  margin: 0 0 6px;
`;

export const ListingCount = styled.p`
  color: rgba(20, 21, 24, 0.6);
  margin: 0;
`;

export const EmptyState = styled.div`
  border: 1px dashed rgba(20, 21, 24, 0.18);
  border-radius: 14px;
  padding: 48px 24px;
  text-align: center;
`;

export const EmptyTitle = styled.p`
  font: 600 18px var(--font-display);
  margin: 0 0 6px;
`;

export const EmptyHint = styled.p`
  color: var(--sold);
  margin: 0;
`;
