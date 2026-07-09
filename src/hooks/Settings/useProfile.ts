"use client";
import useSWR from "swr";
import type { IUserProfileDto } from "@/server/models/users/types";
import { fetcher } from "../../constants/fetcher";

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR<IUserProfileDto>("/admin/profile", fetcher);
  return { profile: data, error, isLoading, mutate };
}
