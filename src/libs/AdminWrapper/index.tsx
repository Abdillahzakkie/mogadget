"use client";

import { AdminAnalytics } from "@/components/AdminAnalytics";
import { AdminStats } from "@/components/AdminStats";
import { AdminTable } from "@/components/AdminTable";
import { CatalogToolbar } from "@/components/CatalogToolbar";
import { useProductFilters } from "@/hooks/Products/useProductFilters";
import { PageTitle } from "@/libs/shared/styled";
import { useAdminProducts } from "../../hooks/Products/useAdminProducts";

export default function AdminWrapper() {
  const { products, isLoading, error, mutate } = useAdminProducts();
  const { filters, setFilter, reset, filtered, total, count } = useProductFilters(products);

  return (
    <>
      <PageTitle $tight>Catalog</PageTitle>
      <AdminStats />
      <AdminAnalytics />
      <CatalogToolbar
        filters={filters}
        setFilter={setFilter}
        reset={reset}
        count={count}
        total={total}
      />
      <AdminTable
        products={filtered}
        total={total}
        count={count}
        isLoading={isLoading}
        error={error}
        mutate={mutate}
      />
    </>
  );
}
