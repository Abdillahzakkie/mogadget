import styled from "styled-components";

// Admin-panel page chrome shared by the dashboard and form wrappers.
export const PageTitle = styled.h1<{ $tight?: boolean }>`
  font: 600 24px var(--font-display);
  margin: ${({ $tight }) => ($tight ? "0 0 18px" : "0 0 20px")};
`;

export const LoadingNote = styled.p`
  color: var(--sold);
`;

export const ErrorNote = styled.p`
  color: var(--danger);
`;
