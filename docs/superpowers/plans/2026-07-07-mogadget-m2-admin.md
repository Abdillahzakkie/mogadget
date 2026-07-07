# MoGadget M2 — Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the single-owner admin panel so the owner can log in and load/manage the real catalog — login/session, dashboard table with quick status/visibility toggles + click column, a taxonomy-aware create/edit form, and photo upload + reorder backed by pluggable object storage (local disk now, AWS S3 later with no code change).

**Architecture:** Add a storage abstraction to `packages/core` (`lib/storage`) with two drivers — `local` (disk-backed, default for local dev) and `s3` (presigned PUT + CDN, lazy-loaded). The API gains an upload flow: a permissioned `POST /api/admin/uploads/sign` mints `{key, uploadUrl, publicUrl}`; the browser PUTs bytes straight to `uploadUrl`; the product stores only image **keys**, which `toPublicProduct` resolves to URLs. `apps/web` gains an edge middleware that verifies the `mg_session` cookie for `/admin/**`, plus admin routes (`/admin/login`, `/admin`, `/admin/products/new`, `/admin/products/[id]`) built on a shared axios mutation client and SWR hooks. All product mutations continue to flow through the existing M1 services (cache-invalidating) and `requirePermission(ProductsWrite)`.

**Tech Stack:** TypeScript ESM, Hono, Mongoose 8, ioredis, Next.js 15 App Router (client components for admin), SWR + axios, `jose` (edge session verify), `zod`, Vitest, Biome. AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) lazy-imported by the s3 driver only.

## Global Constraints

- Package layout: private, `type: module`, consumed raw from `./src` (no build step); subpath exports maps unchanged.
- Response envelope is always `{ code, message, data }`; handlers return `IEnvelope`, never a raw `Response`; sentinel errors thrown and mapped by `handleError`. Exception: the binary static-serve route `GET /uploads/:key` returns raw bytes (it is not a JSON API route and is registered directly on the Hono app, not via the manifest/adapter).
- Permission strings are `resource:action`; every admin mutation calls `await requirePermission(Permission.ProductsWrite)` and is wrapped in `auditAdmin`.
- Product taxonomy invariants (`NEW ⟺ no grade ⟺ RESTOCKABLE ⟺ IN_STOCK/OUT_OF_STOCK ⟺ quantity≥0`; pre-owned ⟺ grade ⟺ UNIQUE_UNIT ⟺ AVAILABLE/SOLD ⟺ quantity null) are enforced server-side by the model + zod; the form must PRODUCE only valid payloads but the server remains the source of truth.
- Design tokens are fixed CSS vars in `globals.css` (`--ink #141518`, `--paper #FAFAF7`, `--brand #0B7A3E`, `--danger #C4372F` (admin only), `--sold #8A8F98`, `--amber #D98E04`); `--whatsapp` is reserved for public CTAs and MUST NOT appear in admin UI. Fonts: Space Grotesk (display/prices), Instrument Sans (body). Naira formatted `₦450,000` via `formatNaira`.
- Never use the deprecated `new` option on Mongoose `findOneAndUpdate` — use `returnDocument`. (M1 models already comply; new code must too.)
- Never leave orphaned dev-server processes; stop anything started on :3000/:4000 at the end.

---

### Task 1: Storage lib + env

**Files:**
- Create: `packages/core/src/lib/storage.ts`
- Create: `packages/core/src/lib/storage.test.ts`
- Modify: `packages/core/src/constants/environments.ts`
- Modify: `packages/core/src/index.ts` (export storage)
- Modify: `packages/core/package.json` (add AWS SDK deps)

**Interfaces:**
- Consumes: `env` from `constants/environments`.
- Produces:
  - `storageDriver(): "local" | "s3"` — resolved from env.
  - `newImageKey(ext: string): string` → `products/<uuid>.<ext>` (uuid via `crypto.randomUUID()`; ext lowercased, stripped of leading dot, defaults `jpg`).
  - `resolveImageUrl(key: string): string` — `s3` → `${env.cdnBaseUrl}/${key}`; `local` → `${env.apiOrigin}/uploads/${key}`. If `key` already looks absolute (`^https?://`), returns it unchanged (back-compat with M1 passthrough seed data).
  - `signUpload(input: { contentType: string; ext: string }): Promise<{ key: string; uploadUrl: string; publicUrl: string }>` — `local` → `uploadUrl = ${env.apiOrigin}/api/admin/uploads/blob/${key}`; `s3` → presigned PUT URL (lazy import).
  - `writeLocalBlob(key: string, bytes: Uint8Array): Promise<void>` and `readLocalBlob(key: string): Promise<{ bytes: Buffer; contentType: string } | null>` — disk under `env.localUploadDir`; guards against path traversal (`key` must match `^products/[A-Za-z0-9._-]+$`).

- [ ] **Step 1: Add env fields.** Append to `packages/core/src/constants/environments.ts` `env` object:

```ts
  storageDriver: (process.env.STORAGE_DRIVER as "local" | "s3" | undefined) ??
    (process.env.AWS_S3_BUCKET ? "s3" : "local"),
  apiOrigin: process.env.API_ORIGIN ?? "http://localhost:4000",
  localUploadDir: process.env.LOCAL_UPLOAD_DIR ?? ".uploads",
  s3Bucket: process.env.AWS_S3_BUCKET ?? "",
  s3Region: process.env.AWS_REGION ?? "us-east-1",
  cdnBaseUrl: process.env.CDN_BASE_URL ?? "",
```

- [ ] **Step 2: Write the failing test** `packages/core/src/lib/storage.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { newImageKey, resolveImageUrl } from "./storage";

describe("storage keys", () => {
  it("mints a namespaced key with normalized extension", () => {
    const k = newImageKey(".JPG");
    expect(k).toMatch(/^products\/[0-9a-f-]{36}\.jpg$/);
  });
  it("defaults extension to jpg", () => {
    expect(newImageKey("")).toMatch(/\.jpg$/);
  });
  it("resolves a local key to the api /uploads path", () => {
    expect(resolveImageUrl("products/abc.jpg")).toBe("http://localhost:4000/uploads/products/abc.jpg");
  });
  it("passes through already-absolute urls (M1 seed data)", () => {
    expect(resolveImageUrl("https://cdn.example/x.jpg")).toBe("https://cdn.example/x.jpg");
  });
});
```

- [ ] **Step 3: Run test to verify it fails.** Run: `yarn workspace @mogadget/core vitest run src/lib/storage.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 4: Implement `packages/core/src/lib/storage.ts`:**

```ts
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "../constants/environments";

const KEY_RE = /^products\/[A-Za-z0-9._-]+$/;
const EXT_CT: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
};

export function storageDriver(): "local" | "s3" {
  return env.storageDriver === "s3" ? "s3" : "local";
}

export function newImageKey(ext: string): string {
  const clean = (ext || "jpg").replace(/^\./, "").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `products/${crypto.randomUUID()}.${clean}`;
}

export function resolveImageUrl(key: string): string {
  if (/^https?:\/\//.test(key)) return key;
  if (storageDriver() === "s3") return `${env.cdnBaseUrl.replace(/\/$/, "")}/${key}`;
  return `${env.apiOrigin.replace(/\/$/, "")}/uploads/${key}`;
}

export async function signUpload(input: { contentType: string; ext: string }): Promise<{
  key: string; uploadUrl: string; publicUrl: string;
}> {
  const key = newImageKey(input.ext);
  if (storageDriver() === "s3") {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = new S3Client({ region: env.s3Region });
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: env.s3Bucket, Key: key, ContentType: input.contentType }),
      { expiresIn: 300 },
    );
    return { key, uploadUrl, publicUrl: resolveImageUrl(key) };
  }
  return {
    key,
    uploadUrl: `${env.apiOrigin.replace(/\/$/, "")}/api/admin/uploads/blob/${key}`,
    publicUrl: resolveImageUrl(key),
  };
}

function localPath(key: string): string {
  if (!KEY_RE.test(key)) throw new Error("invalid key");
  return path.join(env.localUploadDir, key);
}

export async function writeLocalBlob(key: string, bytes: Uint8Array): Promise<void> {
  const p = localPath(key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, bytes);
}

export async function readLocalBlob(key: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  try {
    const bytes = await fs.readFile(localPath(key));
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    return { bytes, contentType: EXT_CT[ext] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Export from core.** In `packages/core/src/index.ts`, add to the `lib` exports section: `export * from "./lib/storage";`

- [ ] **Step 6: Add AWS deps.** In `packages/core/package.json` `dependencies`, add `"@aws-sdk/client-s3": "^3.700.0"` and `"@aws-sdk/s3-request-presigner": "^3.700.0"`. Run `yarn install`.

- [ ] **Step 7: Run test to verify it passes.** Run: `yarn workspace @mogadget/core vitest run src/lib/storage.test.ts` — Expected: PASS (4 tests). Then `yarn workspace @mogadget/core ts.check` — Expected: clean.

- [ ] **Step 8: Commit.**

```bash
git add packages/core services/api docs
git commit -m "feat(core): pluggable image storage (local disk + S3 presign drivers)"
```

---

### Task 2: DTO resolves image key → URL

**Files:**
- Modify: `services/api/src/routes/products/dto.ts`
- Modify: `services/api/src/routes/products/dto.test.ts` (assert resolution)

**Interfaces:**
- Consumes: `resolveImageUrl` from `@mogadget/core`.
- Produces: `toPublicProduct` unchanged signature; `images[].url` is now `resolveImageUrl(key)`.

- [ ] **Step 1: Update the test.** In `dto.test.ts`, add an image with a bare key and assert the emitted url is the resolved `/uploads/...` path (localhost:4000). Keep existing assertions.

- [ ] **Step 2: Run to verify it fails.** Run: `yarn workspace @mogadget/api vitest run src/routes/products/dto.test.ts` — Expected: FAIL (url still equals key).

- [ ] **Step 3: Implement.** In `dto.ts`, import `resolveImageUrl` from `@mogadget/core`; change the images map to `.map((i) => ({ url: resolveImageUrl(i.key), sortOrder: i.sortOrder }))`. Update the file's top comment.

- [ ] **Step 4: Run to verify it passes.** Run: `yarn workspace @mogadget/api vitest run src/routes/products/dto.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add services/api
git commit -m "feat(api): resolve product image keys to storage URLs in DTO"
```

---

### Task 3: Upload routes (sign / blob PUT / static GET)

**Files:**
- Create: `services/api/src/routes/admin/uploads/sign/route.ts`
- Create: `services/api/src/routes/admin/uploads/blob/[key]/route.ts`
- Modify: `services/api/src/routes/manifest.ts` (register sign + blob)
- Modify: `services/api/src/app.ts` (register public `GET /uploads/*` static serve)
- Modify: `packages/contracts/src/schemas/products.ts` (add `uploadSignSchema`)
- Modify: `packages/contracts/src/schemas/index.ts` (export if barrel lists individually)

**Interfaces:**
- Consumes: `signUpload`, `writeLocalBlob`, `readLocalBlob`, `requirePermission`, `withApiHandler`, `ok`, `created`, `ErrInvalidFields`, `ErrNotFound` from core; `Permission` from contracts.
- Produces:
  - `POST /api/admin/uploads/sign` [products:write] body `{contentType, ext}` → `{key, uploadUrl, publicUrl}`.
  - `PUT /api/admin/uploads/blob/:key` [products:write] — reads raw body, `writeLocalBlob`, returns `{key}` (local driver path; used by the browser after /sign).
  - `GET /uploads/*` — public binary serve via `readLocalBlob`.

- [ ] **Step 1: Add `uploadSignSchema`** to `packages/contracts/src/schemas/products.ts`:

```ts
export const uploadSignSchema = z.object({
  contentType: z.string().trim().min(1),
  ext: z.string().trim().max(8).optional().default(""),
});
export type TUploadSignInput = z.infer<typeof uploadSignSchema>;
```

Ensure it is re-exported by `schemas/index.ts` (add if the barrel enumerates names).

- [ ] **Step 2: Create the sign route** `services/api/src/routes/admin/uploads/sign/route.ts`:

```ts
import { withApiHandler, ok, requirePermission, validateBody, signUpload } from "@mogadget/core";
import { Permission } from "@mogadget/contracts/iam";
import { uploadSignSchema } from "@mogadget/contracts/schemas";

export const POST = withApiHandler({ route: "/api/admin/uploads/sign" }, async (req) => {
  await requirePermission(Permission.ProductsWrite);
  const { contentType, ext } = await validateBody(req, uploadSignSchema);
  const guessed = ext || contentType.split("/")[1] || "jpg";
  return ok(await signUpload({ contentType, ext: guessed }));
});
```

- [ ] **Step 3: Create the blob PUT route** `services/api/src/routes/admin/uploads/blob/[key]/route.ts`:

```ts
import { withApiHandler, ok, requirePermission, writeLocalBlob, ErrInvalidFields } from "@mogadget/core";
import { Permission } from "@mogadget/contracts/iam";

interface ICtx { params: Promise<{ key: string }> }

export const PUT = withApiHandler<ICtx>(
  { route: "/api/admin/uploads/blob/[key]" },
  async (req, ctx) => {
    await requirePermission(Permission.ProductsWrite);
    const { key } = await ctx.params;
    const fullKey = `products/${key}`;
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.byteLength === 0) throw ErrInvalidFields;
    await writeLocalBlob(fullKey, buf);
    return ok({ key: fullKey });
  },
);
```

Note: the manifest path exposes `:key` as the filename only; the route re-prepends the `products/` namespace so the stored key matches what `/sign` minted. (The frontend PUTs to the exact `uploadUrl` from `/sign`, so `key` here is the filename segment.)

- [ ] **Step 4: Register in manifest.** In `services/api/src/routes/manifest.ts` add imports and entries:

```ts
import * as uploadSign from "./admin/uploads/sign/route";
import * as uploadBlob from "./admin/uploads/blob/[key]/route";
// ...
  { method: "POST", path: "/api/admin/uploads/sign", handler: h(uploadSign.POST) },
  { method: "PUT", path: "/api/admin/uploads/blob/:key", handler: h(uploadBlob.PUT) },
```

Add `"PUT"` to `IRouteEntry.method` union and to `app.ts` method dispatch (`else if (r.method === "PUT") app.put(r.path, bind);`).

- [ ] **Step 5: Register the static serve** in `services/api/src/app.ts`, before the manifest loop:

```ts
import { readLocalBlob } from "@mogadget/core";
// inside createApp, after /health:
app.get("/uploads/*", async (c) => {
  const key = c.req.path.replace(/^\/uploads\//, "");
  const blob = await readLocalBlob(key);
  if (!blob) return c.json({ code: 404, message: "Not found", data: null }, 404);
  return new Response(blob.bytes, {
    headers: { "content-type": blob.contentType, "cache-control": "public, max-age=31536000, immutable" },
  });
});
```

- [ ] **Step 6: Typecheck.** Run: `yarn workspace @mogadget/api ts.check` and `yarn workspace @mogadget/contracts ts.check` — Expected: clean.

- [ ] **Step 7: Manual smoke (servers up, seeded).** Start API on :4000. Log in to get a cookie (reuse the M1 login flow), then:

```bash
# sign
curl -s -X POST localhost:4000/api/admin/uploads/sign -H "content-type: application/json" \
  -H "cookie: mg_session=<token>" -d '{"contentType":"image/png","ext":"png"}'
# PUT bytes to the returned uploadUrl, then GET the publicUrl → 200 image/png
```

Expected: `/sign` → 200 with `{key,uploadUrl,publicUrl}`; unauthenticated `/sign` → 401.

- [ ] **Step 8: Commit.**

```bash
git add services/api packages/contracts
git commit -m "feat(api): image upload flow — sign + local blob PUT + static serve"
```

---

### Task 4: Web edge middleware gating /admin/**

**Files:**
- Create: `apps/web/src/middleware.ts`
- Modify: `apps/web/package.json` (add `jose`)

**Interfaces:**
- Consumes: `mg_session` cookie, `SESSION_SECRET` env (shared with API), `jose.jwtVerify`.
- Produces: redirect unauthenticated `/admin/**` (except `/admin/login`) → `/admin/login?next=<path>`; redirect authenticated `/admin/login` → `/admin`.

- [ ] **Step 1: Add `jose`** to `apps/web/package.json` dependencies (`"jose": "^5.9.0"`). Run `yarn install`.

- [ ] **Step 2: Implement `apps/web/src/middleware.ts`:**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me",
);

async function isValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("mg_session")?.value;
  const authed = await isValid(token);

  if (pathname === "/admin/login") {
    if (authed) return NextResponse.redirect(new URL("/admin", req.url));
    return NextResponse.next();
  }
  if (!authed) {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
```

- [ ] **Step 3: Typecheck.** Run: `yarn workspace @mogadget/web ts.check` — Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add apps/web
git commit -m "feat(web): edge middleware gating /admin with jose session verify"
```

---

### Task 5: Web admin client + hooks + route constants

**Files:**
- Create: `apps/web/src/constants/routes.ts`
- Create: `apps/web/src/lib/adminApi.ts`
- Create: `apps/web/src/hooks/products/useAdminProducts.ts`

**Interfaces:**
- Consumes: `api` (axios) from `constants/fetcher`, `fetcher`; `IProductDto`, `TCreateProductInput`/`TUpdateProductInput` shapes from contracts.
- Produces:
  - `routes` object: `home`, `catalog`, `product(slug)`, `adminLogin`, `admin`, `adminNew`, `adminEdit(id)`.
  - `adminApi`: `login`, `logout`, `create(payload)`, `update(id, patch)`, `remove(id)`, `setStatus(id, status)`, `setVisibility(id, isVisible)`, `setImages(id, images)`, `signUpload(contentType, ext)`, `uploadFile(file) → {key}`.
  - `useAdminProducts()` → SWR `{ products, isLoading, error, mutate }` off `/admin/products`.

- [ ] **Step 1: `apps/web/src/constants/routes.ts`:**

```ts
export const routes = {
  home: "/",
  catalog: "/products",
  product: (slug: string) => `/products/${slug}`,
  adminLogin: "/admin/login",
  admin: "/admin",
  adminNew: "/admin/products/new",
  adminEdit: (id: string) => `/admin/products/${id}`,
};
```

- [ ] **Step 2: `apps/web/src/lib/adminApi.ts`:**

```ts
import type { IProductDto } from "@mogadget/contracts/types";
import { api } from "../constants/fetcher";

type ImageRef = { key: string; sortOrder: number };

async function uploadFile(file: File): Promise<{ key: string }> {
  const ext = file.name.split(".").pop() ?? "";
  const { data: sign } = await api.post("/admin/uploads/sign", {
    contentType: file.type || "image/jpeg",
    ext,
  });
  const { uploadUrl, key } = sign.data as { uploadUrl: string; key: string; publicUrl: string };
  // uploadUrl is absolute (points at the API host); PUT raw bytes with credentials for the local driver.
  await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    credentials: "include",
    headers: { "content-type": file.type || "application/octet-stream" },
  });
  return { key };
}

export const adminApi = {
  login: (username: string, password: string) =>
    api.post("/admin/login", { username, password }).then((r) => r.data.data),
  logout: () => api.post("/admin/logout").then((r) => r.data.data),
  create: (payload: unknown) =>
    api.post<{ data: IProductDto }>("/admin/products", payload).then((r) => r.data.data),
  update: (id: string, patch: unknown) =>
    api.patch<{ data: IProductDto }>(`/admin/products/${id}`, patch).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/admin/products/${id}`).then((r) => r.data.data),
  setStatus: (id: string, status: string) =>
    api.post(`/admin/products/${id}/status`, { status }).then((r) => r.data.data),
  setVisibility: (id: string, isVisible: boolean) =>
    api.post(`/admin/products/${id}/visibility`, { isVisible }).then((r) => r.data.data),
  setImages: (id: string, images: ImageRef[]) =>
    api.post(`/admin/products/${id}/images`, { images }).then((r) => r.data.data),
  uploadFile,
};
```

- [ ] **Step 3: `apps/web/src/hooks/products/useAdminProducts.ts`:**

```ts
"use client";
import useSWR from "swr";
import type { IProductDto } from "@mogadget/contracts/types";
import { fetcher } from "../../constants/fetcher";

export function useAdminProducts() {
  const { data, error, isLoading, mutate } = useSWR<IProductDto[]>("/admin/products", fetcher);
  return { products: data ?? [], error, isLoading, mutate };
}
```

- [ ] **Step 4: Add `swr`** to `apps/web/package.json` if not already present; run `yarn install`. Typecheck: `yarn workspace @mogadget/web ts.check` — Expected: clean.

- [ ] **Step 5: Commit.**

```bash
git add apps/web
git commit -m "feat(web): admin api client, admin-products SWR hook, route constants"
```

---

### Task 6: /admin/login page

**Files:**
- Create: `apps/web/src/app/admin/login/page.tsx`

**Interfaces:**
- Consumes: `adminApi.login`, `routes`, `useRouter`/`useSearchParams` from `next/navigation`.
- Produces: a client login form; on success pushes to `next` param or `/admin`.

- [ ] **Step 1: Implement the page** (client component): username + password fields, submit calls `adminApi.login`, shows inline error on 401, uses `--danger` for errors, `--brand` submit button, Space Grotesk wordmark. On success `router.push(next ?? routes.admin)` then `router.refresh()`.

- [ ] **Step 2: Manual verify.** With middleware active, hitting `/admin` unauthenticated redirects to `/admin/login`; submitting `owner`/`password` lands on `/admin`. Typecheck clean.

- [ ] **Step 3: Commit.**

```bash
git add apps/web
git commit -m "feat(web): admin login page"
```

---

### Task 7: /admin dashboard

**Files:**
- Create: `apps/web/src/app/admin/layout.tsx`
- Create: `apps/web/src/app/admin/page.tsx`
- Create: `apps/web/src/components/AdminTable/index.tsx`

**Interfaces:**
- Consumes: `useAdminProducts`, `adminApi`, `formatNaira`, `CONDITION_LABEL`, `routes`.
- Produces: admin shell (header w/ wordmark + "New listing" + Logout) and a table: thumbnail, name, condition badge, price, status (button cycles the state-machine value), visibility (toggle), clicks (`wa + ig`), edit link. Mutations call `adminApi.*` then `mutate()` (optimistic-friendly re-fetch).

- [ ] **Step 1: `admin/layout.tsx`** — a minimal client-free shell wrapping children with an admin header (wordmark, links to `routes.adminNew`, and a Logout button rendered by a small client component that calls `adminApi.logout` then `router.push(routes.adminLogin)`).

- [ ] **Step 2: `AdminTable/index.tsx`** (client) — renders rows from `useAdminProducts`. Status control: for `RESTOCKABLE` products cycle `IN_STOCK ⇄ OUT_OF_STOCK`; for `UNIQUE_UNIT` cycle `AVAILABLE ⇄ SOLD` (derive allowed target from `stockType`; never offer an invalid transition). Visibility: toggle button. Each mutation calls the corresponding `adminApi` method then `mutate()`.

- [ ] **Step 3: `admin/page.tsx`** — renders `<AdminTable/>`; empty state links to `routes.adminNew`.

- [ ] **Step 4: Manual verify.** Dashboard lists all seeded products incl. hidden; toggling visibility/status persists (reload shows change); clicks column shows counts. Typecheck clean.

- [ ] **Step 5: Commit.**

```bash
git add apps/web
git commit -m "feat(web): admin dashboard — product table with status/visibility toggles + clicks"
```

---

### Task 8: Product form (taxonomy-aware) + image upload/reorder

**Files:**
- Create: `apps/web/src/components/ProductForm/index.tsx`

**Interfaces:**
- Consumes: `CATEGORIES`, `BRANDS_BY_CATEGORY`, `CONDITION_LABEL`, `GRADE_GLOSSARY` from contracts; `adminApi.uploadFile`, `resolveImageUrl` equivalent (use `publicUrl` returned by upload or the product's `images[].url`).
- Produces: `ProductForm({ initial?: IProductDto; onSubmit(payload) })`. Emits a payload matching `createProductSchema`:
  - `condition` select: `NEW | UK_USED | NIGERIAN_USED` (from `conditionSchema`).
  - When `condition === "NEW"`: hide grade; `stockType` forced `RESTOCKABLE`; `status` select `IN_STOCK | OUT_OF_STOCK`; `quantity` numeric ≥ 0.
  - When pre-owned: show `cosmeticGrade` select (A/B/C with glossary tooltip); `stockType` forced `UNIQUE_UNIT`; `status` select `AVAILABLE | SOLD`; `quantity` omitted (null).
  - Images: file input → `adminApi.uploadFile` per file → append `{key, sortOrder}`; thumbnails with up/down reorder + remove; sortOrder recomputed from array order on submit.

**Interfaces (invariant helper):** derive `stockType`/allowed statuses purely from `condition` so the form can never build an invalid payload (mirrors `assertProductInvariants`); the server still validates.

- [ ] **Step 1: Implement the form** as a controlled client component. Guarantee the emitted payload always satisfies the taxonomy invariant (branch on NEW vs pre-owned as above). Brand is a datalist from `BRANDS_BY_CATEGORY[category]` but free-text allowed. Price input is integer Naira.

- [ ] **Step 2: Typecheck** `yarn workspace @mogadget/web ts.check` — Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add apps/web
git commit -m "feat(web): taxonomy-aware product form with image upload + reorder"
```

---

### Task 9: /admin/products/new + [id] pages

**Files:**
- Create: `apps/web/src/app/admin/products/new/page.tsx`
- Create: `apps/web/src/app/admin/products/[id]/page.tsx`
- Create: `apps/web/src/app/admin/products/[id]/EditClient.tsx`

**Interfaces:**
- Consumes: `ProductForm`, `adminApi`, `routes`, `useRouter`; edit page fetches the product via SWR on `/admin/products/:id` (or reuses `useAdminProducts` + find).
- Produces:
  - `new/page.tsx` (client): `<ProductForm onSubmit={p => adminApi.create(p).then(() => router.push(routes.admin))} />`.
  - `[id]/page.tsx` (server) → renders `<EditClient id={...}/>` (client) which loads the product, feeds `initial`, and on submit calls `adminApi.update(id, patch)`; includes a Delete button (`--danger`) calling `adminApi.remove(id)` then back to `/admin`.

- [ ] **Step 1: Implement new page.** On submit → create → redirect to `/admin`.

- [ ] **Step 2: Implement edit page + EditClient.** Load product (SWR `/admin/products/:id` via `fetcher`), render `ProductForm initial=...`. On submit → update. Delete button confirms then removes.

- [ ] **Step 3: Manual verify end-to-end.** Create a NEW product with an uploaded photo → appears in dashboard AND public `/` catalog (cache invalidated); edit it, change price → reflected; mark a pre-owned unit SOLD from the table → public card shows SOLD styling; delete → gone. NEW-with-grade is impossible to submit from the form, and if forced, server returns 400.

- [ ] **Step 4: Commit.**

```bash
git add apps/web
git commit -m "feat(web): admin create/edit/delete product pages wired to storage + services"
```

---

### Task 10: Verification, docs, cleanup

**Files:**
- Modify: `README.md` (status: M2 done; add storage env vars + upload note)
- Modify: `.gitignore` (add `.uploads/`)

- [ ] **Step 1: Ignore local uploads.** Add `.uploads/` to `.gitignore`.

- [ ] **Step 2: Full test + typecheck.** Run `yarn test` (all workspaces, needs Mongo+Redis) and `yarn ts.check`. Expected: all green.

- [ ] **Step 3: End-to-end smoke** with both servers: login → create with photo → dashboard toggles → public reflects → logout redirects. Confirm unauthenticated `/admin` redirects to login and unauthenticated API mutation returns 401.

- [ ] **Step 4: Update README** status section (M2 → done) and document new env vars: `STORAGE_DRIVER`, `API_ORIGIN`, `LOCAL_UPLOAD_DIR`, `AWS_S3_BUCKET`, `AWS_REGION`, `CDN_BASE_URL`. Note default local-disk driver.

- [ ] **Step 5: Stop dev servers** on :3000/:4000; confirm 0 listeners.

- [ ] **Step 6: Commit.**

```bash
git add README.md .gitignore
git commit -m "docs: M2 admin panel complete; storage env vars + status"
```

---

## Self-Review

- **Spec coverage:** login/session (T4/T6), dashboard table with status+visibility toggles + click column (T7), create/edit form with photo upload + reorder (T8/T9), server-validated invariants (form guarantees + existing server enforcement), S3 wiring (T1, driver-swappable), image key→url resolution (T2). §8 upload route (`/images` already exists from M1; T3 adds the sign+blob it depends on). All M2 spec bullets mapped.
- **Placeholder scan:** none — every code step has concrete content; UI-heavy steps (T6–T9) describe exact fields/behavior with the payload contract fixed by `createProductSchema`.
- **Type consistency:** `signUpload`/`resolveImageUrl`/`newImageKey` names consistent across T1→T2→T3→T5; `adminApi` method names consistent T5→T7→T8→T9; image ref shape `{key, sortOrder}` matches the existing `/images` route body schema and the model.
- **Note on TDD scope:** logic (storage keys/urls, DTO resolution) is unit-tested (T1/T2), matching M1's domain-only TDD; React admin UI is verified by manual end-to-end smoke (no component-test harness exists in this repo), consistent with M1's web-shell verification.
