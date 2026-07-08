"use client";
import type { IProductDto } from "@/server/validators/types";
import { routes } from "../../constants/routes";
import { formatNaira } from "../../helpers/format";
import { ConditionBadge } from "../ConditionBadge";
import {
  BadgeRow,
  Card,
  CardLink,
  Name,
  OutOfStockRibbon,
  Photo,
  PhotoImg,
  Placeholder,
  Price,
  Ribbon,
} from "./styled";

// Catalog/home grid tile (spec §9): 4:3 photo, badge row, 2-line name clamp, firm price.
// SOLD units stay visible but desaturated with a ribbon (product doc §5.2).
export function ProductCard({ product }: { product: IProductDto }) {
  const sold = product.status === "SOLD";
  const oos = product.status === "OUT_OF_STOCK";
  const primary = product.images[0]?.url;
  return (
    <CardLink href={routes.product(product.slug)}>
      <Card $sold={sold}>
        <Photo $sold={sold}>
          {primary ? (
            // eslint-disable-next-line @next/next/no-img-element
            <PhotoImg src={primary} alt={product.name} loading="lazy" decoding="async" />
          ) : (
            <Placeholder>MoGadget</Placeholder>
          )}
          {sold && <Ribbon>SOLD</Ribbon>}
          {oos && <OutOfStockRibbon>OUT OF STOCK</OutOfStockRibbon>}
        </Photo>
        <BadgeRow>
          <ConditionBadge
            condition={product.condition}
            cosmeticGrade={product.cosmeticGrade}
            status={product.status}
          />
        </BadgeRow>
        <Name>{product.name}</Name>
        <Price className="price" $sold={sold}>
          {formatNaira(product.priceNaira)}
        </Price>
      </Card>
    </CardLink>
  );
}
