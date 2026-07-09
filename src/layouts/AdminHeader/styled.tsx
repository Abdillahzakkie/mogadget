import Link from "next/link";
import styled from "styled-components";

export const NavLink = styled(Link)`
  height: 38px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 9px;
  color: var(--ink);
  font: 600 13px var(--font-body);

  &:hover {
    color: var(--ink);
    background: rgba(20, 21, 24, 0.05);
  }
`;

export const Bar = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  border-bottom: 1px solid rgba(20, 21, 24, 0.1);
  background: #fff;
`;

/* Inline styles previously pinned the color on hover too (they beat the global
   a:hover rule), so the hover locks preserve the original rendering. */
export const WordmarkLink = styled(Link)`
  font: 700 20px var(--font-display);
  color: var(--ink);

  &:hover {
    color: var(--ink);
  }
`;

export const BrandAccent = styled.span`
  color: var(--brand);
`;

export const AdminTag = styled.span`
  font: 500 12px var(--font-body);
  color: var(--sold);
  margin-left: 8px;
`;

export const Actions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

export const NewListingLink = styled(Link)`
  height: 38px;
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  border-radius: 9px;
  background: var(--brand);
  color: #fff;
  font: 600 13px var(--font-body);

  &:hover {
    color: #fff;
  }
`;

export const LogoutButton = styled.button`
  height: 38px;
  padding: 0 14px;
  border-radius: 9px;
  border: 1px solid rgba(20, 21, 24, 0.18);
  background: transparent;
  color: var(--ink);
  font: 600 13px var(--font-body);
  cursor: pointer;
`;
