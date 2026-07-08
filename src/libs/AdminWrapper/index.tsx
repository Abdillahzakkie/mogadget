"use client";

import { AdminStats } from "@/components/AdminStats";
import { AdminTable } from "@/components/AdminTable";
import { PageTitle } from "@/libs/shared/styled";

export default function AdminWrapper() {
  return (
    <>
      <PageTitle $tight>Catalog</PageTitle>
      <AdminStats />
      <AdminTable />
    </>
  );
}
