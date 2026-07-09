"use client";
import useSWR from "swr";
import type { ISiteConfig } from "@/server/models/siteConfig/types";
import { fetcher } from "../../constants/fetcher";

// Admin-side site config (the editable copy). Distinct from the public SiteConfigProvider, which
// carries the SSR-resolved config for the storefront.
export function useSiteConfigAdmin() {
  const { data, error, isLoading, mutate } = useSWR<ISiteConfig>("/admin/site-config", fetcher);
  return { config: data, error, isLoading, mutate };
}
