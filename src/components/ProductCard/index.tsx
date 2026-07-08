import Link from "next/link";
import type { IProductDto } from "@/server/validators/types";
import { routes } from "../../constants/routes";
import { formatNaira } from "../../helpers/format";
import { ConditionBadge } from "../ConditionBadge";

// Catalog/home grid tile (spec §9): 4:3 photo, badge row, 2-line name clamp, firm price.
// SOLD units stay visible but desaturated with a ribbon (product doc §5.2).
export function ProductCard({ product }: { product: IProductDto }) {
  const sold = product.status === "SOLD";
  const oos = product.status === "OUT_OF_STOCK";
  const primary = product.images[0]?.url;
  return (
    <Link href={routes.product(product.slug)} style={{ color: "inherit", display: "block" }}>
      <article style={{ opacity: sold ? 0.8 : 1 }}>
        <div style={{ ...photo, filter: sold ? "grayscale(.9)" : "none" }}>
          {primary ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primary}
              alt={product.name}
              loading="lazy"
              decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <span style={placeholder}>MoGadget</span>
          )}
          {sold && <span style={ribbon}>SOLD</span>}
          {oos && <span style={{ ...ribbon, background: "var(--sold)" }}>OUT OF STOCK</span>}
        </div>
        <div style={{ marginTop: 10, marginBottom: 6 }}>
          <ConditionBadge
            condition={product.condition}
            cosmeticGrade={product.cosmeticGrade}
            status={product.status}
          />
        </div>
        <div style={name}>{product.name}</div>
        <div
          className="price"
          style={{
            fontWeight: 700,
            fontSize: 17,
            color: sold ? "var(--sold)" : "var(--ink)",
            textDecoration: sold ? "line-through" : "none",
          }}
        >
          {formatNaira(product.priceNaira)}
        </div>
      </article>
    </Link>
  );
}

const photo = {
  position: "relative" as const,
  aspectRatio: "4 / 3",
  borderRadius: 12,
  background: "#ECEAE3",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const placeholder = {
  color: "#B9B5A8",
  font: "600 14px var(--font-display)",
  letterSpacing: ".04em",
};
const ribbon = {
  position: "absolute" as const,
  top: 10,
  left: 10,
  background: "var(--ink)",
  color: "#fff",
  font: "700 10px var(--font-body)",
  letterSpacing: ".08em",
  padding: "4px 8px",
  borderRadius: 6,
};
const name = {
  fontSize: 14,
  lineHeight: 1.35,
  margin: "0 0 6px",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
  minHeight: "2.7em",
};
