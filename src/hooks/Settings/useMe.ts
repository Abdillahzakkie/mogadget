"use client";
import useSWR from "swr";
import { fetcher } from "../../constants/fetcher";

export interface IMe {
  sub: string;
  username: string;
  permissions: string[];
}

// The current admin's identity + effective permissions, used to gate settings nav and actions.
export function useMe() {
  const { data, error, isLoading, mutate } = useSWR<IMe>("/admin/me", fetcher);
  const can = (perm: string) => !!data?.permissions.includes(perm);
  return { me: data, error, isLoading, mutate, can };
}
