"use client";

import { ProductCard } from "@/components/ProductCard";
import { routes } from "@/constants/routes";
import { CATEGORIES, CATEGORY_LABEL } from "@/server/validators/constants";
import type { IProductDto } from "@/server/validators/types";
import {
  CategoryChip,
  CategoryRow,
  CategorySection,
  EmptyNote,
  FeaturedGrid,
  FeaturedHead,
  FeaturedSection,
  FeaturedTitle,
  GhostButton,
  Hero,
  HeroActions,
  HeroSub,
  HeroTitle,
  PrimaryButton,
  ViewAllLink,
} from "./styled";

export default function HomeWrapper({ products }: { products: IProductDto[] }) {
  return (
    <>
      <Hero>
        <HeroTitle>New &amp; UK-used gadgets. Real photos, firm prices.</HeroTitle>
        <HeroSub>
          Every pre-owned unit is graded, tested and photographed — what you see is the exact unit
          you get. Browse, then chat to order on WhatsApp.
        </HeroSub>
        <HeroActions>
          <PrimaryButton href={routes.catalog}>Shop all gadgets</PrimaryButton>
          <GhostButton href={routes.contact}>Visit the store</GhostButton>
        </HeroActions>
      </Hero>

      <CategorySection>
        <CategoryRow>
          {CATEGORIES.map((cat) => (
            <CategoryChip key={cat} href={`${routes.catalog}?category=${cat}`}>
              {CATEGORY_LABEL[cat]}
            </CategoryChip>
          ))}
        </CategoryRow>
      </CategorySection>

      <FeaturedSection>
        <FeaturedHead>
          <FeaturedTitle>Just in</FeaturedTitle>
          <ViewAllLink href={routes.catalog}>View all →</ViewAllLink>
        </FeaturedHead>
        {products.length === 0 ? (
          <EmptyNote>
            No products yet — run <code>yarn seed</code>.
          </EmptyNote>
        ) : (
          <FeaturedGrid>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </FeaturedGrid>
        )}
      </FeaturedSection>
    </>
  );
}
