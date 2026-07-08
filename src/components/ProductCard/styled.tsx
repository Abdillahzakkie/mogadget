import Link from "next/link";
import styled from "styled-components";

export const CardLink = styled(Link)`
  color: inherit;
  display: block;
`;

export const Card = styled.article<{ $sold: boolean }>`
  opacity: ${(p) => (p.$sold ? 0.8 : 1)};
`;

export const Photo = styled.div<{ $sold: boolean }>`
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: 12px;
  background: #eceae3;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: ${(p) => (p.$sold ? "grayscale(.9)" : "none")};
`;

export const PhotoImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

export const Placeholder = styled.span`
  color: #b9b5a8;
  font: 600 14px var(--font-display);
  letter-spacing: 0.04em;
`;

export const Ribbon = styled.span`
  position: absolute;
  top: 10px;
  left: 10px;
  background: var(--ink);
  color: #fff;
  font: 700 10px var(--font-body);
  letter-spacing: 0.08em;
  padding: 4px 8px;
  border-radius: 6px;
`;

export const OutOfStockRibbon = styled(Ribbon)`
  background: var(--sold);
`;

export const BadgeRow = styled.div`
  margin-top: 10px;
  margin-bottom: 6px;
`;

export const Name = styled.div`
  font-size: 14px;
  line-height: 1.35;
  margin: 0 0 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.7em;
`;

export const Price = styled.div<{ $sold: boolean }>`
  font-weight: 700;
  font-size: 17px;
  color: ${(p) => (p.$sold ? "var(--sold)" : "var(--ink)")};
  text-decoration: ${(p) => (p.$sold ? "line-through" : "none")};
`;
