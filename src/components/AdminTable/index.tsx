"use client";
import Link from "next/link";
import { Fragment, useState } from "react";
import { CATEGORY_LABEL, CONDITION_LABEL } from "@/server/validators/constants";
import type { IAdminProductDto, TStatus } from "@/server/validators/types";
import { routes } from "../../constants/routes";
import { formatNaira } from "../../helpers/format";
import { adminApi } from "../../lib/adminApi";
import {
  ClicksTd,
  DetailBlock,
  DetailCell,
  DetailGrid,
  DetailRow,
  EditLink,
  ErrorText,
  ExpandBtn,
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

//  RESTOCKABLE:  IN_STOCK ⇄ OUT_OF_STOCK      UNIQUE_UNIT:  AVAILABLE ⇄ SOLD
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
const STOCK_LABEL = { RESTOCKABLE: "Restockable", UNIQUE_UNIT: "Unique" } as const;

const isPositive = (s: TStatus): boolean => s === "IN_STOCK" || s === "AVAILABLE";

// Compact date + relative age, e.g. "1 Jul 2026 · 8d".
function formatAdded(iso: string): string {
  const d = new Date(iso);
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
  const age = days === 0 ? "today" : days < 30 ? `${days}d` : `${Math.floor(days / 30)}mo`;
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · ${age}`;
}

const HEADERS: { key: string; label: string }[] = [
  { key: "expand", label: "" },
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "condition", label: "Condition" },
  { key: "price", label: "Price" },
  { key: "stock", label: "Stock" },
  { key: "qty", label: "Qty" },
  { key: "status", label: "Status" },
  { key: "visible", label: "Visible" },
  { key: "clicks", label: "Clicks" },
  { key: "added", label: "Added" },
  { key: "edit", label: "" },
];

interface Props {
  products: IAdminProductDto[];
  total: number;
  count: number;
  isLoading: boolean;
  error: unknown;
  mutate: () => Promise<unknown>;
}

export function AdminTable({ products, total, count, isLoading, error, mutate }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

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
  if (total === 0) {
    return (
      <MutedText>
        No products yet. <Link href={routes.adminNew}>Create your first listing →</Link>
      </MutedText>
    );
  }
  if (count === 0) {
    return <MutedText>No listings match your filters. Try clearing them.</MutedText>;
  }

  return (
    <TableScroll>
      <Table>
        <thead>
          <tr>
            {HEADERS.map((h) => (
              <Th key={h.key}>{h.label}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const busy = busyId === p.id;
            const open = openId === p.id;
            const thumb = p.images[0]?.url;
            return (
              <Fragment key={p.id}>
                <Row $busy={busy}>
                  <Td>
                    <ExpandBtn
                      type="button"
                      aria-label={open ? "Collapse" : "Expand"}
                      onClick={() => setOpenId(open ? null : p.id)}
                    >
                      {open ? "−" : "+"}
                    </ExpandBtn>
                  </Td>
                  <NameTd>
                    {p.name}
                    <SubText>
                      {p.brand}
                      {p.cosmeticGrade ? ` · Grade ${p.cosmeticGrade}` : ""}
                    </SubText>
                  </NameTd>
                  <Td>{CATEGORY_LABEL[p.category]}</Td>
                  <Td>{CONDITION_LABEL[p.condition]}</Td>
                  <PriceTd>{formatNaira(p.priceNaira)}</PriceTd>
                  <Td>{STOCK_LABEL[p.stockType]}</Td>
                  <Td>{typeof p.quantity === "number" ? p.quantity : "—"}</Td>
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
                  <Td>{formatAdded(p.createdAt)}</Td>
                  <Td>
                    <EditLink href={routes.adminEdit(p.id)}>Edit</EditLink>
                  </Td>
                </Row>
                {open && (
                  <DetailRow>
                    <DetailCell colSpan={HEADERS.length}>
                      <DetailGrid>
                        <DetailBlock>
                          <h4>Specs</h4>
                          {p.specs.length ? (
                            <ul>
                              {p.specs.map((s) => (
                                <li key={s.label}>
                                  {s.label}: {s.value}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>No specs listed.</p>
                          )}
                        </DetailBlock>
                        <DetailBlock>
                          <h4>Description</h4>
                          <p>{p.description?.trim() ? p.description : "No description."}</p>
                        </DetailBlock>
                        <DetailBlock>
                          <h4>Media</h4>
                          <ThumbBox $url={thumb} />
                          <p>
                            {p.images.length} image{p.images.length === 1 ? "" : "s"}
                          </p>
                        </DetailBlock>
                        <DetailBlock>
                          <h4>Timeline</h4>
                          <p>Added {formatAdded(p.createdAt)}</p>
                          <p>Updated {formatAdded(p.updatedAt)}</p>
                        </DetailBlock>
                      </DetailGrid>
                    </DetailCell>
                  </DetailRow>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </Table>
    </TableScroll>
  );
}
