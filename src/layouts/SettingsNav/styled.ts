"use client";
import Link from "next/link";
import styled from "styled-components";

export const Shell = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 28px;
  align-items: start;

  @media (max-width: 780px) {
    grid-template-columns: 1fr;
  }
`;

export const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: sticky;
  top: 24px;

  @media (max-width: 780px) {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 6px;
  }
`;

export const NavItem = styled(Link)<{ $active?: boolean }>`
  padding: 9px 12px;
  border-radius: 9px;
  font: 500 14px var(--font-body);
  color: ${({ $active }) => ($active ? "var(--ink)" : "var(--sold)")};
  background: ${({ $active }) => ($active ? "rgba(11,122,62,0.08)" : "transparent")};

  &:hover {
    color: var(--ink);
    background: rgba(20, 21, 24, 0.05);
  }
`;

export const Content = styled.div`
  min-width: 0;
`;
