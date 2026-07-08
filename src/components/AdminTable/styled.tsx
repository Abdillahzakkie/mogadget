import Link from "next/link";
import styled from "styled-components";

export const MutedText = styled.p`
  color: var(--sold);
`;

export const ErrorText = styled.p`
  color: var(--danger);
`;

export const TableScroll = styled.div`
  overflow-x: auto;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: #fff;
`;

export const Th = styled.th`
  text-align: left;
  font: 600 11px var(--font-body);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sold);
  padding: 10px 12px;
  border-bottom: 1px solid rgba(20, 21, 24, 0.1);
`;

export const Td = styled.td`
  padding: 10px 12px;
  border-bottom: 1px solid rgba(20, 21, 24, 0.06);
  font-size: 14px;
  vertical-align: middle;
`;

export const Row = styled.tr<{ $busy: boolean }>`
  opacity: ${(p) => (p.$busy ? 0.5 : 1)};
`;

export const ThumbBox = styled.div<{ $url?: string }>`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: #eceae3;
  background-size: cover;
  background-position: center;
  background-image: ${(p) => (p.$url ? `url(${p.$url})` : "none")};
`;

export const NameTd = styled(Td)`
  font-weight: 600;
`;

export const SubText = styled.div`
  font: 400 12px var(--font-body);
  color: var(--sold);
`;

export const PriceTd = styled(Td)`
  font-family: var(--font-display);
  font-variant-numeric: tabular-nums;
`;

const Pill = styled.button`
  padding: 4px 10px;
  border-radius: 999px;
  border: 1.5px solid;
  background: transparent;
  font: 600 12px var(--font-body);
  cursor: pointer;
`;

export const StatusPill = styled(Pill)<{ $positive: boolean }>`
  border-color: ${(p) => (p.$positive ? "var(--brand)" : "var(--sold)")};
  color: ${(p) => (p.$positive ? "var(--brand)" : "var(--sold)")};
`;

export const VisibilityPill = styled(Pill)<{ $visible: boolean }>`
  border-color: ${(p) => (p.$visible ? "var(--ink)" : "var(--sold)")};
  color: ${(p) => (p.$visible ? "var(--ink)" : "var(--sold)")};
`;

export const ClicksTd = styled(Td)`
  color: var(--sold);
  font-size: 13px;
`;

export const EditLink = styled(Link)`
  font: 600 13px var(--font-body);
`;
