"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { ProductForm } from "@/components/ProductForm";
import { fetcher } from "@/constants/fetcher";
import { routes } from "@/constants/routes";
import { adminApi } from "@/lib/adminApi";
import { ErrorNote, LoadingNote, PageTitle } from "@/libs/shared/styled";
import type { IAdminProductDto } from "@/server/validators/types";

// One wrapper serves both admin form pages: mode="new" creates, mode="edit" loads by the
// route's [id] param and updates/deletes.
export default function ProductFormWrapper({ mode }: { mode: "new" | "edit" }) {
  const router = useRouter();
  if (mode === "new") {
    return (
      <>
        <PageTitle>New listing</PageTitle>
        <ProductForm
          submitLabel="Create listing"
          onSubmit={async (payload, images) => {
            const created = await adminApi.create(payload);
            if (images.length) await adminApi.setImages(created.id, images);
            router.push(routes.admin);
            router.refresh();
          }}
        />
      </>
    );
  }
  return <EditProduct />;
}

function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useSWR<IAdminProductDto>(
    id ? `/admin/products/${id}` : null,
    fetcher,
  );

  if (isLoading) return <LoadingNote>Loading…</LoadingNote>;
  if (error || !data) return <ErrorNote>Product not found.</ErrorNote>;

  return (
    <>
      <PageTitle>Edit — {data.name}</PageTitle>
      <ProductForm
        initial={data}
        submitLabel="Save changes"
        onSubmit={async (payload, images) => {
          await adminApi.update(id, payload);
          await adminApi.setImages(id, images);
          router.push(routes.admin);
          router.refresh();
        }}
        onDelete={async () => {
          await adminApi.remove(id);
          router.push(routes.admin);
          router.refresh();
        }}
      />
    </>
  );
}
