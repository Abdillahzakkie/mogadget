"use client";
import Link from "next/link";
import styled from "styled-components";

// Shared building blocks for every settings sub-page: section cards, form fields, buttons,
// toggles, tables, and status notes. Keeping them in one place means the profile, security,
// site-config, IAM, and audit screens all read as one system.

export const SectionTitle = styled.h1`
  font: 600 22px var(--font-display);
  margin: 0 0 4px;
`;
export const SectionLead = styled.p`
  color: var(--sold);
  font-size: 14px;
  margin: 0 0 20px;
`;

export const Card = styled.section`
  background: #fff;
  border: 1px solid rgba(20, 21, 24, 0.1);
  border-radius: 14px;
  padding: 20px 22px;
  margin-bottom: 18px;
`;
export const CardTitle = styled.h2`
  font: 600 16px var(--font-display);
  margin: 0 0 4px;
`;
export const CardHint = styled.p`
  color: var(--sold);
  font-size: 13px;
  margin: 0 0 16px;
`;

export const Field = styled.label`
  display: block;
  margin-bottom: 14px;
`;
export const FieldLabel = styled.span`
  display: block;
  font: 500 12px var(--font-body);
  color: var(--sold);
  margin-bottom: 6px;
`;
export const Input = styled.input`
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid rgba(20, 21, 24, 0.18);
  border-radius: 9px;
  font: 400 14px var(--font-body);
  background: #fff;

  &:focus {
    outline: 2px solid rgba(11, 122, 62, 0.4);
    border-color: transparent;
  }
`;
export const Textarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 10px 12px;
  border: 1px solid rgba(20, 21, 24, 0.18);
  border-radius: 9px;
  font: 400 14px var(--font-body);
  resize: vertical;
`;

export const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const Button = styled.button<{ $variant?: "primary" | "ghost" | "danger" }>`
  height: 40px;
  padding: 0 16px;
  border-radius: 9px;
  font: 600 13px var(--font-body);
  cursor: pointer;
  border: 1px solid transparent;
  background: ${({ $variant }) =>
    $variant === "danger"
      ? "var(--danger, #c0362c)"
      : $variant === "ghost"
        ? "transparent"
        : "var(--brand)"};
  color: ${({ $variant }) => ($variant === "ghost" ? "var(--ink)" : "#fff")};
  border-color: ${({ $variant }) => ($variant === "ghost" ? "rgba(20,21,24,0.18)" : "transparent")};

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`;

export const Actions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 4px;
`;

export const Toggle = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(20, 21, 24, 0.06);
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }
`;
export const ToggleText = styled.div`
  font-size: 14px;
`;
export const ToggleHint = styled.div`
  color: var(--sold);
  font-size: 12px;
  margin-top: 2px;
`;

export const Ok = styled.p`
  color: var(--brand);
  font-size: 13px;
  margin: 8px 0 0;
`;
export const Err = styled.p`
  color: var(--danger, #c0362c);
  font-size: 13px;
  margin: 8px 0 0;
`;
export const Muted = styled.p`
  color: var(--sold);
  font-size: 13px;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(20, 21, 24, 0.08);
    vertical-align: top;
  }
  th {
    color: var(--sold);
    font: 500 12px var(--font-body);
  }
`;
export const TableScroll = styled.div`
  overflow-x: auto;
`;

// Home-grid card link.
export const HomeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
`;
export const HomeCard = styled(Link)`
  display: block;
  padding: 18px;
  border: 1px solid rgba(20, 21, 24, 0.1);
  border-radius: 14px;
  background: #fff;
  color: var(--ink);

  &:hover {
    border-color: rgba(11, 122, 62, 0.5);
    color: var(--ink);
  }
`;
export const HomeCardTitle = styled.div`
  font: 600 15px var(--font-display);
  margin-bottom: 4px;
`;
export const HomeCardDesc = styled.div`
  color: var(--sold);
  font-size: 13px;
`;
