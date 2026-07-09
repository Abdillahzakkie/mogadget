"use client";
import useSWR from "swr";
import { fetcher } from "../../constants/fetcher";
import type { IPasskey, ISecurityStatus } from "../../lib/securityApi";

export function useSecurityStatus() {
  const { data, error, isLoading, mutate } = useSWR<ISecurityStatus>(
    "/admin/security/status",
    fetcher,
  );
  return { status: data, error, isLoading, mutate };
}

export function usePasskeys() {
  const { data, error, isLoading, mutate } = useSWR<IPasskey[]>(
    "/admin/security/passkeys",
    fetcher,
  );
  return { passkeys: data ?? [], error, isLoading, mutate };
}
