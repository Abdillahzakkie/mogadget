"use client";
import useSWR from "swr";
import type { IProductDto } from "@mogadget/contracts/types";
import { fetcher } from "../../constants/fetcher";

export function useAdminProducts() {
  const { data, error, isLoading, mutate } = useSWR<IProductDto[]>("/admin/products", fetcher);
  return { products: data ?? [], error, isLoading, mutate };
}
