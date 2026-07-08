"use client";
import Link from "next/link";
import { useState } from "react";
import { CONDITION_LABEL } from "@/server/validators/constants";
import type { IAdminProductDto, TStatus } from "@/server/validators/types";
import { routes } from "../../constants/routes";
import { formatNaira } from "../../helpers/format";
import { useAdminProducts } from "../../hooks/Products/useAdminProducts";
import { adminApi } from "../../lib/adminApi";
import {
  ClicksTd,
  EditLink,
  ErrorText,
  MutedText,
  NameTd,
  PriceTd,
  Row,
  StatusPill,
  SubText,
  Table,
  TableScroll,
  Td,
  Th,
  ThumbBox,
  VisibilityPill,
} from "./styled";

// The two product state machines (must never offer an invalid transition):
//  RESTOCKABLE:  IN_STOCK ⇄ OUT_OF_STOCK
//  UNIQUE_UNIT:  AVAILABLE ⇄ SOLD
function nextStatus(p: IAdminProductDto): TStatus {
  if (p.stockType === "RESTOCKABLE") return p.status === "IN_STOCK" ? "OUT_OF_STOCK" : "IN_STOCK";
  return p.status === "AVAILABLE" ? "SOLD" : "AVAILABLE";
}

const STATUS_LABEL: Record<TStatus, string> = {
  IN_STOCK: "In stock",
  OUT_OF_STOCK: "Out of stock",
  AVAILABLE: "Available",
  SOLD: "Sold",
};

function isPositive(s: TStatus): boolean {
  return s === "IN_STOCK" || s === "AVAILABLE";
}

export function AdminTable() {
  const { products, isLoading, error, mutate } = useAdminProducts();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await fn();
      await mutate();
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) return <MutedText>Loading…</MutedText>;
  if (error) return <ErrorText>Failed to load products.</ErrorText>;
  if (products.length === 0) {
    return (
      <MutedText>
        No products yet. <Link href={routes.adminNew}>Create your first listing →</Link>
      </MutedText>
    );
  }

  return (
    <TableScroll>
      <Table>
        <thead>
          <tr>
            {["", "Name", "Condition", "Price", "Status", "Visible", "Clicks", ""].map((h, i) => (
              <Th key={i}>{h}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const busy = busyId === p.id;
            const thumb = p.images[0]?.url;
            return (
              <Row key={p.id} $busy={busy}>
                <Td>
                  <ThumbBox $url={thumb} />
                </Td>
                <NameTd>
                  {p.name}
                  <SubText>
                    {p.brand}
                    {p.cosmeticGrade ? ` · Grade ${p.cosmeticGrade}` : ""}
                  </SubText>
                </NameTd>
                <Td>{CONDITION_LABEL[p.condition]}</Td>
                <PriceTd>{formatNaira(p.priceNaira)}</PriceTd>
                <Td>
                  <StatusPill
                    type="button"
                    disabled={busy}
                    onClick={() => run(p.id, () => adminApi.setStatus(p.id, nextStatus(p)))}
                    title={`Set to ${STATUS_LABEL[nextStatus(p)]}`}
                    $positive={isPositive(p.status)}
                  >
                    {STATUS_LABEL[p.status]}
                    {typeof p.quantity === "number" ? ` (${p.quantity})` : ""}
                  </StatusPill>
                </Td>
                <Td>
                  <VisibilityPill
                    type="button"
                    disabled={busy}
                    onClick={() => run(p.id, () => adminApi.setVisibility(p.id, !p.isVisible))}
                    $visible={p.isVisible}
                  >
                    {p.isVisible ? "Visible" : "Hidden"}
                  </VisibilityPill>
                </Td>
                <ClicksTd>
                  {p.whatsappClickCount}wa · {p.instagramClickCount}ig
                </ClicksTd>
                <Td>
                  <EditLink href={routes.adminEdit(p.id)}>Edit</EditLink>
                </Td>
              </Row>
            );
          })}
        </tbody>
      </Table>
    </TableScroll>
  );
}
