"use client";
import { useRouter } from "next/navigation";
import { ProductForm } from "../../../../../components/ProductForm";
import { adminApi } from "../../../../../lib/adminApi";
import { routes } from "../../../../../constants/routes";

export default function NewProductPage() {
  const router = useRouter();
  return (
    <>
      <h1 style={{ font: "600 24px var(--font-display)", margin: "0 0 20px" }}>New listing</h1>
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
