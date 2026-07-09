"use client";
import useSWR from "swr";
import type { IClickTrends } from "@/server/validators/types";
import { fetcher } from "../../constants/fetcher";

export function useClickTrends(days: number) {
  const { data, error, isLoading } = useSWR<IClickTrends>(
    `/admin/analytics/clicks?days=${days}`,
    fetcher,
  );
  return { trends: data, error, isLoading };
}
