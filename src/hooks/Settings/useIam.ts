"use client";
import useSWR from "swr";
import type { IGroup } from "@/server/models/groups/types";
import type { IPolicy } from "@/server/models/policies/types";
import type { IUserProfileDto } from "@/server/models/users/types";
import { fetcher } from "../../constants/fetcher";

export function useIamUsers() {
  const { data, error, isLoading, mutate } = useSWR<IUserProfileDto[]>("/admin/iam/users", fetcher);
  return { users: data ?? [], error, isLoading, mutate };
}
export function useIamGroups() {
  const { data, error, isLoading, mutate } = useSWR<IGroup[]>("/admin/iam/groups", fetcher);
  return { groups: data ?? [], error, isLoading, mutate };
}
export function useIamPolicies() {
  const { data, error, isLoading, mutate } = useSWR<IPolicy[]>("/admin/iam/policies", fetcher);
  return { policies: data ?? [], error, isLoading, mutate };
}
