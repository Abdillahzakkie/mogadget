import Link from "next/link";
import styled from "styled-components";

export const Hero = styled.section`
  padding: 44px 0 20px;
`;

export const HeroTitle = styled.h1`
  font: 600 44px/1.08 var(--font-display);
  letter-spacing: -0.015em;
  margin: 0 0 14px;
  max-width: 18ch;
`;

export const HeroSub = styled.p`
  color: rgba(20, 21, 24, 0.65);
  max-width: 52ch;
  font-size: 16px;
  line-height: 1.5;
`;

export const HeroActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 22px;
  flex-wrap: wrap;
`;

export const PrimaryButton = styled(Link)`
  background: var(--brand);
  color: #fff;
  font: 600 15px var(--font-body);
  padding: 12px 20px;
  border-radius: 10px;

  &:hover {
    color: #fff;
  }
`;

export const GhostButton = styled(Link)`
  color: var(--ink);
  font: 600 15px var(--font-body);
  padding: 12px 20px;
  border-radius: 10px;
  border: 1px solid rgba(20, 21, 24, 0.16);

  /* Inline styles used to pin the color through :hover; keep that behavior. */
  &:hover {
    color: var(--ink);
  }
`;

export const CategorySection = styled.section`
  padding: 8px 0 4px;
`;

export const CategoryRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
`;

export const CategoryChip = styled(Link)`
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(20, 21, 24, 0.14);
  color: var(--ink);
  font: 500 14px var(--font-body);
  background: #fff;

  /* Inline styles used to pin the color through :hover; keep that behavior. */
  &:hover {
    color: var(--ink);
  }
`;

export const FeaturedSection = styled.section`
  padding: 24px 0 8px;
`;

export const FeaturedHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

export const FeaturedTitle = styled.h2`
  font: 600 22px var(--font-display);
  margin: 0;
`;

export const ViewAllLink = styled(Link)`
  font: 500 14px var(--font-body);
`;

export const EmptyNote = styled.p`
  color: var(--sold);
  margin-top: 16px;
`;

export const FeaturedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 22px;
  margin-top: 18px;
`;
