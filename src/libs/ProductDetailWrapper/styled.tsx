import Link from "next/link";
import styled from "styled-components";

export const Crumbs = styled.nav`
  padding: 18px 0 0;
  color: var(--sold);
  font: 400 13px var(--font-body);
`;

export const CrumbLink = styled(Link)`
  color: var(--sold);

  /* Inline styles used to pin the color through :hover; keep that behavior. */
  &:hover {
    color: var(--sold);
  }
`;

export const CrumbCurrent = styled.span`
  color: var(--sold);
`;

export const BadgeRow = styled.div`
  margin-bottom: 10px;
`;

export const Title = styled.h1`
  font: 600 28px/1.15 var(--font-display);
  margin: 0 0 12px;
`;

export const Price = styled.div<{ $sold: boolean }>`
  font-size: 30px;
  font-weight: 700;
  color: ${({ $sold }) => ($sold ? "var(--sold)" : "var(--ink)")};
  text-decoration: ${({ $sold }) => ($sold ? "line-through" : "none")};
`;

export const StatusNote = styled.p<{ $brand?: boolean }>`
  margin-top: 12px;
  margin-bottom: 0;
  font: 500 14px var(--font-body);
  color: ${({ $brand }) => ($brand ? "var(--brand)" : "var(--sold)")};
`;

export const Description = styled.p`
  color: rgba(20, 21, 24, 0.75);
  line-height: 1.6;
  margin-top: 16px;
`;

export const GradeBox = styled.p`
  margin-top: 16px;
  padding: 12px 14px;
  background: rgba(217, 142, 4, 0.08);
  border: 1px solid rgba(217, 142, 4, 0.25);
  border-radius: 10px;
  color: var(--amber-text);
  font-size: 14px;
  line-height: 1.5;
`;

export const SpecsBlock = styled.div`
  margin-top: 20px;
`;

export const SpecTitle = styled.div`
  font: 600 12px var(--font-body);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(20, 21, 24, 0.6);
  margin-bottom: 10px;
`;

export const SpecCell = styled.div`
  background: var(--paper);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const SpecLabel = styled.div`
  color: var(--sold);
  font-size: 12px;
`;

export const SpecValue = styled.div`
  font-size: 15px;
`;

export const CtaColumn = styled.div`
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const Reassurance = styled.p`
  color: var(--sold);
  font-size: 13px;
  margin: 0;
`;
