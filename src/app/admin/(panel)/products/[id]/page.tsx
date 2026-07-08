"use client";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import type { IAdminProductDto } from "@/server/validators/types";
import { ProductForm } from "../../../../../components/ProductForm";
import { fetcher } from "../../../../../constants/fetcher";
import { routes } from "../../../../../constants/routes";
import { adminApi } from "../../../../../lib/adminApi";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useSWR<IAdminProductDto>(
    id ? `/admin/products/${id}` : null,
    fetcher,
  );

  if (isLoading) return <p style={{ color: "var(--sold)" }}>Loading…</p>;
  if (error || !data) return <p style={{ color: "var(--danger)" }}>Product not found.</p>;

  return (
    <>
      <h1 style={{ font: "600 24px var(--font-display)", margin: "0 0 20px" }}>
        Edit — {data.name}
      </h1>
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
