"use client";

import { InstagramCta, WhatsAppButton } from "@/components/ChatCta";
import { ConditionBadge } from "@/components/ConditionBadge";
import { Gallery } from "@/components/Gallery";
import { routes } from "@/constants/routes";
import { formatNaira } from "@/helpers/format";
import { GRADE_GLOSSARY } from "@/server/validators/constants";
import type { IProductDto } from "@/server/validators/types";
import {
  BadgeRow,
  CrumbCurrent,
  CrumbLink,
  Crumbs,
  CtaColumn,
  Description,
  GradeBox,
  Price,
  Reassurance,
  SpecCell,
  SpecLabel,
  SpecsBlock,
  SpecTitle,
  SpecValue,
  StatusNote,
  Title,
} from "./styled";

export default function ProductDetailWrapper({ product }: { product: IProductDto }) {
  const sold = product.status === "SOLD";
  const oos = product.status === "OUT_OF_STOCK";
  const gradeNote =
    product.condition !== "NEW" && product.cosmeticGrade
      ? GRADE_GLOSSARY[product.cosmeticGrade]
      : null;

  const ctaLabel = sold
    ? "Ask about a similar unit"
    : oos
      ? "Ask us to restock"
      : "Chat on WhatsApp to order";

  return (
    <>
      <Crumbs>
        <CrumbLink href={routes.home}>Home</CrumbLink> /{" "}
        <CrumbLink href={routes.catalog}>Shop</CrumbLink> /{" "}
        <CrumbCurrent>{product.name}</CrumbCurrent>
      </Crumbs>

      <div className="product-detail">
        <Gallery images={product.images} name={product.name} sold={sold} />

        <div>
          <BadgeRow>
            <ConditionBadge
              condition={product.condition}
              cosmeticGrade={product.cosmeticGrade}
              status={product.status}
            />
          </BadgeRow>
          <Title>{product.name}</Title>
          <Price className="price" $sold={sold}>
            {formatNaira(product.priceNaira)}
          </Price>

          {sold && (
            <StatusNote>
              This exact unit has been sold. Chat and we'll find you a similar one.
            </StatusNote>
          )}
          {oos && (
            <StatusNote>
              Currently out of stock — message us and we'll let you know when it's back.
            </StatusNote>
          )}
          {product.condition === "NEW" &&
            product.status === "IN_STOCK" &&
            typeof product.quantity === "number" && (
              <StatusNote $brand>
                In stock{product.quantity <= 3 ? ` — only ${product.quantity} left` : ""}
              </StatusNote>
            )}

          {product.description && <Description>{product.description}</Description>}

          {gradeNote && (
            <GradeBox>
              <strong>Grade {product.cosmeticGrade}:</strong> {gradeNote}
            </GradeBox>
          )}

          {product.specs.length > 0 && (
            <SpecsBlock>
              <SpecTitle>Specifications</SpecTitle>
              <div className="spec-grid">
                {product.specs.map((s) => (
                  <SpecCell key={s.label}>
                    <SpecLabel>{s.label}</SpecLabel>
                    <SpecValue>{s.value}</SpecValue>
                  </SpecCell>
                ))}
              </div>
            </SpecsBlock>
          )}

          <CtaColumn>
            <WhatsAppButton product={product} label={ctaLabel} />
            <InstagramCta product={product} />
            <Reassurance>
              1-month warranty · Free delivery in Lagos · Nationwide delivery
            </Reassurance>
          </CtaColumn>
        </div>
      </div>

      {/* Sticky mobile buy bar — appears under 820px where the inline CTA scrolls away. */}
      <div className="sticky-wa">
        <WhatsAppButton product={product} label={ctaLabel} />
      </div>
    </>
  );
}
