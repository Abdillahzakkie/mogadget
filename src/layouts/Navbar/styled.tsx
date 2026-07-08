import Link from "next/link";
import styled from "styled-components";

export const Bar = styled.header`
  border-bottom: 1px solid rgba(20, 21, 24, 0.08);
  background: var(--paper);
`;

export const Wrap = styled.div`
  max-width: 1240px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

/* Inline styles previously pinned the color on hover too (they beat the global
   a:hover rule), so the hover lock preserves the original rendering. */
export const WordmarkLink = styled(Link)`
  font: 700 22px var(--font-display);
  color: var(--ink);

  &:hover {
    color: var(--ink);
  }
`;

export const BrandAccent = styled.span`
  color: var(--brand);
`;

export const Nav = styled.nav`
  display: flex;
  gap: 22px;
  align-items: center;
`;

export const NavLink = styled(Link)`
  color: var(--ink);
  font: 500 15px var(--font-body);

  &:hover {
    color: var(--ink);
  }
`;
