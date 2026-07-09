"use client";
import useSWR from "swr";
import { fetcher } from "../../constants/fetcher";
import type { IAuditPage } from "../../lib/settingsApi";

export interface IAuditFilters {
  action?: string;
  page: number;
}

export function useAudit({ action, page }: IAuditFilters) {
  const params = new URLSearchParams();
  if (action) params.set("action", action);
  params.set("page", String(page));
  params.set("limit", "25");
  const key = `/admin/audit?${params.toString()}`;
  const { data, error, isLoading } = useSWR<IAuditPage>(key, fetcher);
  return { data, error, isLoading };
}
