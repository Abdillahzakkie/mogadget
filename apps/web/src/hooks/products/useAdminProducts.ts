"use client";
import useSWR from "swr";
import type { IAdminProductDto } from "@mogadget/contracts/types";
import { fetcher } from "../../constants/fetcher";

export function useAdminProducts() {
  const { data, error, isLoading, mutate } = useSWR<IAdminProductDto[]>("/admin/products", fetcher);
  return { products: data ?? [], error, isLoading, mutate };
}
