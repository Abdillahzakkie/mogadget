import type { IProductDto } from "@/server/validators/types";
import { api } from "../constants/fetcher";

export type ImageRef = { key: string; sortOrder: number };

async function uploadFile(file: File): Promise<{ key: string; publicUrl: string }> {
  const ext = file.name.split(".").pop() ?? "";
  const { data: sign } = await api.post("/admin/uploads/sign", {
    contentType: file.type || "image/jpeg",
    ext,
  });
  const { uploadUrl, key, publicUrl } = sign.data as {
    uploadUrl: string;
    key: string;
    publicUrl: string;
  };
  // uploadUrl is absolute (points at the API host). PUT the raw bytes with credentials so the
  // local storage driver's permissioned blob route accepts them.
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    credentials: "include",
    headers: { "content-type": file.type || "application/octet-stream" },
  });
  if (!res.ok) throw new Error(`upload failed (${res.status})`);
  return { key, publicUrl };
}

export const adminApi = {
  login: (username: string, password: string) =>
    api.post("/admin/login", { username, password }).then((r) => r.data.data),
  logout: () => api.post("/admin/logout").then((r) => r.data.data),
  create: (payload: unknown): Promise<IProductDto> =>
    api.post("/admin/products", payload).then((r) => r.data.data),
  update: (id: string, patch: unknown): Promise<IProductDto> =>
    api.patch(`/admin/products/${id}`, patch).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/admin/products/${id}`).then((r) => r.data.data),
  setStatus: (id: string, status: string): Promise<IProductDto> =>
    api.post(`/admin/products/${id}/status`, { status }).then((r) => r.data.data),
  setVisibility: (id: string, isVisible: boolean): Promise<IProductDto> =>
    api.post(`/admin/products/${id}/visibility`, { isVisible }).then((r) => r.data.data),
  setImages: (id: string, images: ImageRef[]): Promise<IProductDto> =>
    api.post(`/admin/products/${id}/images`, { images }).then((r) => r.data.data),
  uploadFile,
};
