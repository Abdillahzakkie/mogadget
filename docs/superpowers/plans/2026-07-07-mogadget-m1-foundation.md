# MoGadget M1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the MoGadget monorepo foundation — contracts, core (DB/Redis/lib/middleware/models/services), the Hono API with product + auth routes, a seed, and a wired `apps/web` shell — on the Adverta "Golden Bite" architecture, with the product domain layer built test-first.

**Architecture:** Turborepo yarn workspaces scoped `@mogadget/*`. `packages/contracts` (zod + types + IAM catalog + constants) → `packages/core` (Mongoose `*DB` models → Redis cache-aware services → lib/middleware) → `services/api` (Hono host, `withApiHandler` routes, adapter, seed) → `apps/web` (Next.js shell + design tokens). Packages are consumed **raw from `./src`** (no build step). Backend is **MongoDB + Redis**; product taxonomy invariants live in one domain function enforced in the model and re-checked by zod.

**Tech Stack:** TypeScript 5.7 (ESM, `moduleResolution: Bundler`), Mongoose 8, ioredis, Hono, jose (HS256 JWT), argon2, zod, prom-client, Vitest, Biome, Turbo, Next.js 15 (App Router), SWR + axios.

## Global Constraints

- Node ≥ 20. Package manager **yarn 1** (`yarn@1.22.22`); workspaces `apps/*`, `packages/*`, `services/*`.
- Every package: `"private": true`, `"type": "module"`, `"version": "0.1.0"`, `main`/`types` → `./src/index.ts`, no build step; internal deps pinned `"*"`.
- Scope everything `@mogadget/*`. Subpath `exports` maps expose `./models ./services ./lib ./middleware ./databases ./constants ./metrics ./runtime` (core) and `./types ./iam ./schemas ./constants` (contracts).
- Response envelope is **always** `{ code: number, message: string, data: T | null }`; handlers return `IEnvelope`, never a raw `Response`. Errors are thrown sentinels mapped by `handleError`.
- Permission string format is `resource:action`. Explicit **Deny wins** in policy compilation.
- Mongoose: **never** use the deprecated `new` option on `findByIdAndUpdate`/`findOneAndUpdate` — use `returnDocument: "after"`.
- Redis invalidation uses non-blocking cursor `SCAN` (never `KEYS`). Redis boot ping **fails loud** (no in-memory fallback).
- Naira: real `₦` glyph, `₦450,000` formatting (thousands separators, no decimals), tabular numerals in UI.
- Design tokens (verbatim): `--ink #141518`, `--paper #FAFAF7`, `--brand #0B7A3E`, `--whatsapp #25D366` (reserved — one CTA/screen), `--amber #D98E04`, `--sold #8A8F98`, danger `#C4372F`. Fonts: Space Grotesk (display/prices), Instrument Sans (body).
- WhatsApp number: `2348060248044`. Instagram: `@Mo_gadgets`. Store: His Grace Plaza, 14 Francis Oremeji Street, Computer Village, Ikeja, Lagos.
- Commit after every green step. Commit author email `abdullah@exedos.com`. **Do not** add a `Co-Authored-By` trailer.

---

## File Structure

```
mogadget/
├─ package.json                 root workspaces + scripts
├─ turbo.json  tsconfig.base.json  biome.json  vitest.workspace.ts
├─ packages/contracts/src/
│   ├─ index.ts  types.ts  iam.ts
│   ├─ constants.ts            grade glossary, categories, brands, contact, WA number
│   └─ schemas/{index.ts, common.ts, products.ts, auth.ts}
├─ packages/core/src/
│   ├─ index.ts
│   ├─ constants/{index.ts, environments.ts, errors.ts}
│   ├─ databases/{index.ts, mongoDB.ts, redis.ts}
│   ├─ metrics/index.ts
│   ├─ lib/{index.ts, response.ts, handler.ts, session.ts, requestContext.ts,
│   │        validation.ts, password.ts, clientIp.ts, logger.ts}
│   ├─ domain/{index.ts, product.ts, slug.ts, naira.ts, whatsapp.ts}
│   ├─ middleware/{index.ts, withPermission.ts, withAudit.ts, withRateLimit.ts}
│   ├─ models/
│   │   ├─ index.ts  utils.ts
│   │   ├─ products/{index.ts, types.ts}
│   │   ├─ users/{index.ts, types.ts}
│   │   ├─ policies/{index.ts, types.ts}
│   │   ├─ groups/{index.ts, types.ts}
│   │   └─ adminAuditLogs/{index.ts, types.ts}
│   ├─ services/
│   │   ├─ index.ts
│   │   ├─ products/{index.ts, getProductBySlug.ts, listProducts.ts, productFacets.ts,
│   │   │            createProduct.ts, updateProduct.ts, deleteProduct.ts, setStatus.ts,
│   │   │            setVisibility.ts, incrementClick.ts, utils/invalidateCacheKeys.ts}
│   │   └─ iam/{index.ts, resolveEffectivePermissions.ts}
│   └─ runtime/{index.ts, bootstrap.ts}
├─ services/api/src/
│   ├─ index.ts  app.ts
│   ├─ lib/{adapter.ts}
│   ├─ routes/{manifest.ts, auth.ts,
│   │          products/{route.ts, facets/route.ts, [slug]/route.ts, [slug]/click/route.ts,
│   │                    parseSearchParams.ts, dto.ts},
│   │          admin/products/{route.ts, [id]/route.ts, [id]/status/route.ts,
│   │                          [id]/visibility/route.ts, [id]/images/route.ts}}
│   └─ scripts/seed.ts
└─ apps/web/                    Next.js scaffold + styles/global.ts + constants/fetcher.ts + app/page.tsx
```

Test files are co-located as `*.test.ts` beside their source (Vitest).

---

### Task 1: Root workspace scaffold & tooling

**Files:**
- Create: `package.json`, `turbo.json`, `tsconfig.base.json`, `biome.json`, `vitest.workspace.ts`

**Interfaces:**
- Produces: yarn workspaces resolving `@mogadget/*`; scripts `dev`, `build`, `ts.check`, `test`, `lint`, `seed`.

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "mogadget",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "workspaces": ["apps/*", "packages/*", "services/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "start": "turbo run start",
    "ts.check": "turbo run ts.check",
    "test": "vitest run",
    "lint": "biome check .",
    "format": "biome format --write .",
    "seed": "yarn workspace @mogadget/api seed"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.4.0",
    "turbo": "^2.3.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0",
    "@types/node": "^22.0.0"
  },
  "packageManager": "yarn@1.22.22"
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "noUncheckedIndexedAccess": false,
    "verbatimModuleSyntax": false,
    "noEmit": true,
    "types": ["node"]
  }
}
```

- [ ] **Step 3: Create `turbo.json`, `biome.json`, `vitest.workspace.ts`**

`turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "stream",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "start": { "cache": false, "persistent": true },
    "ts.check": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```
`biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.0/schema.json",
  "files": { "ignore": ["node_modules", ".next", ".turbo", "dist"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": { "enabled": true, "rules": { "recommended": true } }
}
```
`vitest.workspace.ts`:
```ts
export default ["packages/*", "services/*"];
```

- [ ] **Step 4: Install and verify**

Run: `yarn install`
Expected: completes, creates root `node_modules` and `yarn.lock`. `yarn ts.check` prints "No tasks were executed" (no packages yet) — acceptable at this point.

- [ ] **Step 5: Commit**

```bash
git add package.json turbo.json tsconfig.base.json biome.json vitest.workspace.ts yarn.lock
git commit -m "chore: root monorepo scaffold (turbo + biome + vitest)"
```

---

### Task 2: `@mogadget/contracts` — envelope, product enums, zod schemas, constants

**Files:**
- Create: `packages/contracts/package.json`, `tsconfig.json`, `src/index.ts`, `src/types.ts`, `src/constants.ts`, `src/schemas/{index.ts,common.ts,products.ts,auth.ts}`
- Test: `packages/contracts/src/schemas/products.test.ts`

**Interfaces:**
- Produces:
  - Types: `IResponseData<T> = { code: number; message: string; data: T | null }`; unions `TCategory`, `TCondition`, `TCosmeticGrade`, `TStatus`, `TStockType`, `TClickChannel`.
  - DTO: `IProductImageDto = { url: string; sortOrder: number }`, `IProductSpecDto = { label: string; value: string }`, `IProductDto` (public shape).
  - Schemas: `createProductSchema`/`TCreateProductInput`, `updateProductSchema`/`TUpdateProductInput`, `productFilterSchema`/`TProductFilter`, `clickSchema`/`TClickInput`, `adminLoginSchema`/`TAdminLoginInput`.
  - Constants: `CATEGORIES`, `CONDITIONS`, `GRADE_GLOSSARY`, `BRANDS_BY_CATEGORY`, `CONTACT`, `WHATSAPP_NUMBER`.

- [ ] **Step 1: Create `packages/contracts/package.json` and `tsconfig.json`**

```json
{
  "name": "@mogadget/contracts",
  "private": true, "version": "0.1.0", "type": "module",
  "main": "./src/index.ts", "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types.ts",
    "./iam": "./src/iam.ts",
    "./schemas": "./src/schemas/index.ts",
    "./constants": "./src/constants.ts"
  },
  "scripts": { "ts.check": "tsc --noEmit" },
  "dependencies": { "zod": "^3.23.0" }
}
```
`tsconfig.json`: `{ "extends": "../../tsconfig.base.json", "include": ["src"] }`

- [ ] **Step 2: Write `src/types.ts` and `src/constants.ts`**

`src/types.ts`:
```ts
export interface IResponseData<T = unknown> { code: number; message: string; data: T | null; }

export type TCategory = "PHONES" | "LAPTOPS" | "AUDIO" | "WEARABLES" | "CONSOLES" | "OTHER";
export type TCondition = "NEW" | "UK_USED" | "US_USED" | "NG_USED";
export type TCosmeticGrade = "A" | "B" | "C";
export type TStatus = "IN_STOCK" | "OUT_OF_STOCK" | "AVAILABLE" | "SOLD";
export type TStockType = "RESTOCKABLE" | "UNIQUE_UNIT";
export type TClickChannel = "whatsapp" | "instagram";

export interface IProductImageDto { url: string; sortOrder: number; }
export interface IProductSpecDto { label: string; value: string; }
export interface IProductDto {
  id: string; slug: string; name: string; category: TCategory; brand: string;
  condition: TCondition; cosmeticGrade: TCosmeticGrade | null; priceNaira: number;
  description: string | null; stockType: TStockType; status: TStatus; quantity: number | null;
  images: IProductImageDto[]; specs: IProductSpecDto[];
  whatsappClickCount: number; instagramClickCount: number;
  createdAt: string; updatedAt: string;
}
```
`src/constants.ts`:
```ts
import type { TCategory, TCondition, TCosmeticGrade } from "./types";

export const CATEGORIES: readonly TCategory[] = ["PHONES","LAPTOPS","AUDIO","WEARABLES","CONSOLES","OTHER"];
export const CONDITIONS: readonly TCondition[] = ["NEW","UK_USED","US_USED","NG_USED"];

export const CONDITION_LABEL: Record<TCondition, string> = {
  NEW: "Brand New", UK_USED: "UK Used", US_USED: "US Used", NG_USED: "Naija Used",
};
export const GRADE_GLOSSARY: Record<TCosmeticGrade, string> = {
  A: "Excellent — little to no visible wear, screen/body near-perfect.",
  B: "Good — light signs of use (minor scuffs), fully functional.",
  C: "Fair — noticeable cosmetic wear, fully functional, priced accordingly.",
};
export const BRANDS_BY_CATEGORY: Record<TCategory, string[]> = {
  PHONES: ["iPhone","Samsung","Google Pixel","Xiaomi"],
  LAPTOPS: ["MacBook","HP","Dell","MSI","Asus","Alienware"],
  AUDIO: ["AirPods","AirPods Pro","AirPods Max"],
  WEARABLES: ["Apple Watch","Pixel Watch"],
  CONSOLES: ["PlayStation","Xbox"],
  OTHER: ["Powerbank","Starlink"],
};
export const WHATSAPP_NUMBER = "2348060248044";
export const CONTACT = {
  whatsapp: WHATSAPP_NUMBER, instagram: "Mo_gadgets", facebook: "Mo Gadgets",
  address: "His Grace Plaza, 14 Francis Oremeji Street, Computer Village, Ikeja, Lagos.",
  hours: "Mon–Sat, 9am–6pm",
} as const;
```

- [ ] **Step 3: Write the failing test `src/schemas/products.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { createProductSchema, productFilterSchema, clickSchema } from "./index";

describe("createProductSchema", () => {
  const base = { name: "iPhone 13", category: "PHONES", brand: "iPhone", priceNaira: 485000,
    condition: "UK_USED", cosmeticGrade: "A", stockType: "UNIQUE_UNIT", status: "AVAILABLE" };
  it("accepts a valid pre-owned product", () => {
    expect(createProductSchema.safeParse(base).success).toBe(true);
  });
  it("rejects a non-integer price", () => {
    expect(createProductSchema.safeParse({ ...base, priceNaira: 485000.5 }).success).toBe(false);
  });
  it("rejects a zero price", () => {
    expect(createProductSchema.safeParse({ ...base, priceNaira: 0 }).success).toBe(false);
  });
});
describe("clickSchema", () => {
  it("accepts whatsapp/instagram only", () => {
    expect(clickSchema.safeParse({ channel: "whatsapp" }).success).toBe(true);
    expect(clickSchema.safeParse({ channel: "email" }).success).toBe(false);
  });
});
describe("productFilterSchema", () => {
  it("coerces numeric price bounds from strings", () => {
    const r = productFilterSchema.parse({ min: "100000", max: "500000" });
    expect(r.min).toBe(100000); expect(r.max).toBe(500000);
  });
});
```

- [ ] **Step 4: Run it, verify it fails**

Run: `yarn vitest run packages/contracts/src/schemas/products.test.ts`
Expected: FAIL — cannot resolve `./index` / schemas undefined.

- [ ] **Step 5: Write `src/schemas/{common.ts,products.ts,auth.ts,index.ts}`**

`common.ts`:
```ts
import { z } from "zod";
export const categorySchema = z.enum(["PHONES","LAPTOPS","AUDIO","WEARABLES","CONSOLES","OTHER"]);
export const conditionSchema = z.enum(["NEW","UK_USED","US_USED","NG_USED"]);
export const gradeSchema = z.enum(["A","B","C"]);
export const statusSchema = z.enum(["IN_STOCK","OUT_OF_STOCK","AVAILABLE","SOLD"]);
export const stockTypeSchema = z.enum(["RESTOCKABLE","UNIQUE_UNIT"]);
```
`products.ts`:
```ts
import { z } from "zod";
import { categorySchema, conditionSchema, gradeSchema, statusSchema, stockTypeSchema } from "./common";

const specSchema = z.object({ label: z.string().trim().min(1), value: z.string().trim().min(1) });

export const createProductSchema = z.object({
  name: z.string().trim().min(1),
  category: categorySchema,
  brand: z.string().trim().min(1),
  condition: conditionSchema,
  cosmeticGrade: gradeSchema.nullish(),
  priceNaira: z.number().int().positive(),
  description: z.string().trim().max(2000).nullish(),
  stockType: stockTypeSchema,
  status: statusSchema,
  quantity: z.number().int().nonnegative().nullish(),
  specs: z.array(specSchema).default([]),
  isVisible: z.boolean().default(true),
});
export type TCreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().omit({ /* slug immutable, not in create */ });
export type TUpdateProductInput = z.infer<typeof updateProductSchema>;

export const clickSchema = z.object({ channel: z.enum(["whatsapp","instagram"]) });
export type TClickInput = z.infer<typeof clickSchema>;

export const productFilterSchema = z.object({
  category: categorySchema.optional(),
  q: z.string().trim().optional(),
  condition: z.array(conditionSchema).optional(),
  brand: z.array(z.string()).optional(),
  min: z.coerce.number().int().nonnegative().optional(),
  max: z.coerce.number().int().nonnegative().optional(),
  sort: z.enum(["newest","price_asc","price_desc"]).default("newest"),
});
export type TProductFilter = z.infer<typeof productFilterSchema>;
```
`auth.ts`:
```ts
import { z } from "zod";
export const adminLoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});
export type TAdminLoginInput = z.infer<typeof adminLoginSchema>;
```
`index.ts`: `export * from "./common"; export * from "./products"; export * from "./auth";`

- [ ] **Step 6: Write `src/index.ts` and run the tests**

`src/index.ts`: `export * from "./types"; export * from "./constants"; export * as iam from "./iam"; export * from "./schemas";`
> Note: `./iam` is created in Task 3; add its export there. For now export the rest and add `iam` in Task 3 Step 5.
Temporarily set `src/index.ts` to `export * from "./types"; export * from "./constants"; export * from "./schemas";`

Run: `yarn vitest run packages/contracts/src/schemas/products.test.ts`
Expected: PASS (all 6 assertions).

- [ ] **Step 7: Commit**

```bash
git add packages/contracts
git commit -m "feat(contracts): envelope, product enums, zod schemas, constants"
```

---

### Task 3: `@mogadget/contracts` — IAM catalog (`iam.ts`)

**Files:**
- Create: `packages/contracts/src/iam.ts`
- Modify: `packages/contracts/src/index.ts` (add `export * as iam from "./iam";`)
- Test: `packages/contracts/src/iam.test.ts`

**Interfaces:**
- Produces: `Permission` (const map), `TPermission` (value union), `ALL_PERMISSIONS`, `IPolicyStatement`, `expandActions`, `compileStatements`, `isValidPolicyStatement`, `BUILTIN_POLICIES`, `BUILTIN_GROUPS`, `SECTION_PERMISSIONS`.

- [ ] **Step 1: Write the failing test `src/iam.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { compileStatements, expandActions, Permission } from "./iam";

describe("compileStatements", () => {
  it("expands a wildcard action to all permissions", () => {
    const perms = compileStatements([{ effect: "Allow", actions: ["*"] }]);
    expect(perms).toContain(Permission.ProductsWrite);
    expect(perms).toContain(Permission.IamManage);
  });
  it("lets an explicit Deny override an Allow", () => {
    const perms = compileStatements([
      { effect: "Allow", actions: ["products:*"] },
      { effect: "Deny", actions: [Permission.ProductsWrite] },
    ]);
    expect(perms).not.toContain(Permission.ProductsWrite);
    expect(perms).toContain(Permission.ProductsRead);
  });
  it("expands a resource wildcard", () => {
    expect(expandActions(["products:*"])).toEqual(
      expect.arrayContaining([Permission.ProductsWrite, Permission.ProductsRead]));
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `yarn vitest run packages/contracts/src/iam.test.ts`
Expected: FAIL — cannot resolve `./iam`.

- [ ] **Step 3: Write `src/iam.ts`**

```ts
export const Permission = {
  ProductsWrite: "products:write",
  ProductsRead: "products:read",
  AnalyticsRead: "analytics:read",
  AuditRead: "audit:read",
  IamManage: "iam:manage",
} as const;
export type TPermission = (typeof Permission)[keyof typeof Permission];
export const ALL_PERMISSIONS: TPermission[] = Object.values(Permission);

export interface IPolicyStatement { effect: "Allow" | "Deny"; actions: string[]; }

export function isValidPolicyAction(a: string): boolean {
  if (a === "*") return true;
  if (a.endsWith(":*")) return ALL_PERMISSIONS.some((p) => p.startsWith(a.slice(0, -1)));
  return (ALL_PERMISSIONS as string[]).includes(a);
}
export function isValidPolicyStatement(s: IPolicyStatement): boolean {
  return (s.effect === "Allow" || s.effect === "Deny") &&
    Array.isArray(s.actions) && s.actions.every(isValidPolicyAction);
}
export function expandActions(actions: string[]): TPermission[] {
  const out = new Set<TPermission>();
  for (const a of actions) {
    if (a === "*") ALL_PERMISSIONS.forEach((p) => out.add(p));
    else if (a.endsWith(":*")) {
      const prefix = a.slice(0, -1);
      ALL_PERMISSIONS.filter((p) => p.startsWith(prefix)).forEach((p) => out.add(p));
    } else if ((ALL_PERMISSIONS as string[]).includes(a)) out.add(a as TPermission);
  }
  return Array.from(out);
}
export function compileStatements(statements: IPolicyStatement[]): TPermission[] {
  const allow = new Set<TPermission>();
  const deny = new Set<TPermission>();
  for (const s of statements) {
    const target = s.effect === "Deny" ? deny : allow;
    for (const p of expandActions(s.actions)) target.add(p);
  }
  for (const p of Array.from(deny)) allow.delete(p);
  return Array.from(allow).sort();
}

export const BUILTIN_POLICIES = [
  { name: "AdministratorAccess", managed: true, statements: [{ effect: "Allow", actions: ["*"] }] as IPolicyStatement[] },
] as const;
export const BUILTIN_GROUPS = [
  { name: "Administrators", managed: true, policyNames: ["AdministratorAccess"] },
] as const;

// Edge-proxy access map: which permission a UI section requires.
export const SECTION_PERMISSIONS: Array<{ prefix: string; permission: TPermission }> = [
  { prefix: "/admin", permission: Permission.ProductsWrite },
];
```

- [ ] **Step 4: Run tests, verify pass**

Run: `yarn vitest run packages/contracts/src/iam.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire `iam` into the barrel and commit**

Set `src/index.ts`:
```ts
export * from "./types";
export * from "./constants";
export * from "./schemas";
export * as iam from "./iam";
```
Run: `yarn vitest run packages/contracts` — Expected: PASS (both files).
```bash
git add packages/contracts
git commit -m "feat(contracts): IAM catalog — permissions, policy compilation, built-ins"
```

---

### Task 4: `@mogadget/core` — errors, response envelope, domain layer (TDD)

**Files:**
- Create: `packages/core/package.json`, `tsconfig.json`, `src/index.ts`, `src/constants/{index.ts,environments.ts,errors.ts}`, `src/lib/response.ts`, `src/domain/{index.ts,product.ts,slug.ts,naira.ts,whatsapp.ts}`
- Test: `src/domain/product.test.ts`, `src/domain/naira.test.ts`, `src/domain/slug.test.ts`, `src/domain/whatsapp.test.ts`

**Interfaces:**
- Produces:
  - `errors`: sentinel objects `ErrInvalidFields`, `ErrInvalidJson`, `ErrUnauthenticated`, `ErrUnauthorized`, `ErrNotFound`, `ErrConflict`, `ErrRateLimited`, `ErrInternal` — each `{ code: number; message: string; __sentinel: true }`; `isSentinel(e)`.
  - `response`: `IEnvelope<T>`, `ok`, `created`, `fail`, `handleError`.
  - `domain`: `assertProductInvariants(input): void` (throws `ErrInvalidFields` on violation), `deriveStatusFromQuantity(qty)`, `generateSlug(name): string`, `formatNaira(n): string`, `buildWhatsAppLink({ name, priceNaira, url }): string`.

- [ ] **Step 1: Create `packages/core/package.json` + `tsconfig.json`**

```json
{
  "name": "@mogadget/core",
  "private": true, "version": "0.1.0", "type": "module",
  "main": "./src/index.ts", "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./constants": "./src/constants/index.ts",
    "./databases": "./src/databases/index.ts",
    "./lib": "./src/lib/index.ts",
    "./domain": "./src/domain/index.ts",
    "./metrics": "./src/metrics/index.ts",
    "./middleware": "./src/middleware/index.ts",
    "./models": "./src/models/index.ts",
    "./services": "./src/services/index.ts",
    "./runtime": "./src/runtime/index.ts"
  },
  "scripts": { "ts.check": "tsc --noEmit", "test": "vitest run" },
  "dependencies": {
    "@mogadget/contracts": "*",
    "mongoose": "^8.9.0", "ioredis": "^5.4.0", "jose": "^5.9.0",
    "argon2": "^0.41.0", "zod": "^3.23.0", "prom-client": "^15.1.0", "pino": "^9.5.0"
  }
}
```
`tsconfig.json`: `{ "extends": "../../tsconfig.base.json", "include": ["src"] }`

- [ ] **Step 2: Write `src/constants/errors.ts` + `environments.ts` + `index.ts` and `src/lib/response.ts`**

`errors.ts`:
```ts
export interface ISentinel { readonly code: number; readonly message: string; readonly __sentinel: true; }
const s = (code: number, message: string): ISentinel => ({ code, message, __sentinel: true });
export const ErrInvalidJson = s(400, "Invalid JSON body");
export const ErrInvalidFields = s(400, "Invalid or missing fields");
export const ErrUnauthenticated = s(401, "Authentication required");
export const ErrUnauthorized = s(403, "Not permitted");
export const ErrNotFound = s(404, "Not found");
export const ErrConflict = s(409, "Conflict");
export const ErrRateLimited = s(429, "Too many requests");
export const ErrInternal = s(500, "Internal error");
export function isSentinel(e: unknown): e is ISentinel {
  return typeof e === "object" && e !== null && (e as ISentinel).__sentinel === true;
}
```
`environments.ts`:
```ts
export const env = {
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/mogadget",
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me",
  sessionMaxAgeSeconds: Number(process.env.SESSION_MAX_AGE ?? 60 * 60 * 24 * 7),
  siteUrl: process.env.SITE_URL ?? "http://localhost:3000",
};
```
`constants/index.ts`: `export * from "./errors"; export * from "./environments";`
`src/lib/response.ts`:
```ts
import type { IResponseData } from "@mogadget/contracts/types";
import { ErrInternal, isSentinel } from "../constants/errors";
export interface IEnvelope<T = unknown> { status: number; body: IResponseData<T>; headers?: Record<string,string>; }
export function ok<T>(data: T, message = "OK"): IEnvelope<T> { return { status: 200, body: { code: 200, message, data } }; }
export function created<T>(data: T, message = "Created"): IEnvelope<T> { return { status: 201, body: { code: 201, message, data } }; }
export function fail(code: number, message: string): IEnvelope<null> { return { status: code, body: { code, message, data: null } }; }
export function handleError(err: unknown): IEnvelope<null> {
  if (isSentinel(err)) return fail(err.code, err.message);
  return fail(ErrInternal.code, ErrInternal.message);
}
```

- [ ] **Step 3: Write the failing domain tests**

`src/domain/naira.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatNaira } from "./naira";
describe("formatNaira", () => {
  it("formats with thousands separators and the ₦ glyph", () => {
    expect(formatNaira(485000)).toBe("₦485,000");
    expect(formatNaira(1850000)).toBe("₦1,850,000");
  });
});
```
`src/domain/slug.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { generateSlug } from "./slug";
describe("generateSlug", () => {
  it("produces a kebab-case, suffixed, unique slug", () => {
    const a = generateSlug("iPhone 13 128GB UK Used");
    expect(a).toMatch(/^iphone-13-128gb-uk-used-[a-z0-9]{4}$/);
    expect(generateSlug("iPhone 13")).not.toBe(generateSlug("iPhone 13"));
  });
});
```
`src/domain/whatsapp.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildWhatsAppLink } from "./whatsapp";
describe("buildWhatsAppLink", () => {
  it("builds an encoded wa.me deep link with name, price, and url", () => {
    const href = buildWhatsAppLink({ name: "iPhone 13 128GB", priceNaira: 485000, url: "https://mo.ng/products/x" });
    expect(href.startsWith("https://wa.me/2348060248044?text=")).toBe(true);
    const text = decodeURIComponent(href.split("text=")[1]);
    expect(text).toContain("iPhone 13 128GB");
    expect(text).toContain("₦485,000");
    expect(text).toContain("https://mo.ng/products/x");
  });
});
```
`src/domain/product.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { assertProductInvariants, deriveStatusFromQuantity } from "./product";
import { ErrInvalidFields } from "../constants/errors";

const newValid = { condition: "NEW", cosmeticGrade: null, stockType: "RESTOCKABLE", status: "IN_STOCK", quantity: 5, priceNaira: 985000 } as const;
const usedValid = { condition: "UK_USED", cosmeticGrade: "A", stockType: "UNIQUE_UNIT", status: "AVAILABLE", quantity: null, priceNaira: 485000 } as const;

describe("assertProductInvariants", () => {
  it("accepts a valid NEW product", () => { expect(() => assertProductInvariants(newValid)).not.toThrow(); });
  it("accepts a valid pre-owned product", () => { expect(() => assertProductInvariants(usedValid)).not.toThrow(); });
  it("rejects NEW with a cosmetic grade", () => {
    expect(() => assertProductInvariants({ ...newValid, cosmeticGrade: "B" })).toThrow(ErrInvalidFields.message);
  });
  it("rejects pre-owned with no grade", () => {
    expect(() => assertProductInvariants({ ...usedValid, cosmeticGrade: null })).toThrow();
  });
  it("rejects a UNIQUE_UNIT carrying a quantity", () => {
    expect(() => assertProductInvariants({ ...usedValid, quantity: 1 })).toThrow();
  });
  it("rejects a RESTOCKABLE with an AVAILABLE status", () => {
    expect(() => assertProductInvariants({ ...newValid, status: "AVAILABLE" })).toThrow();
  });
  it("rejects a non-integer price", () => {
    expect(() => assertProductInvariants({ ...newValid, priceNaira: 10.5 })).toThrow();
  });
});
describe("deriveStatusFromQuantity", () => {
  it("maps 0 → OUT_OF_STOCK and >0 → IN_STOCK", () => {
    expect(deriveStatusFromQuantity(0)).toBe("OUT_OF_STOCK");
    expect(deriveStatusFromQuantity(3)).toBe("IN_STOCK");
  });
});
```

- [ ] **Step 4: Run domain tests, verify they fail**

Run: `yarn vitest run packages/core/src/domain`
Expected: FAIL — modules not found.

- [ ] **Step 5: Implement the domain modules**

`src/domain/naira.ts`:
```ts
export function formatNaira(n: number): string {
  return `₦${Math.trunc(n).toLocaleString("en-US")}`;
}
```
`src/domain/slug.ts`:
```ts
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
function shortId(len = 4): string {
  let out = "";
  const bytes = new Uint8Array(len);
  (globalThis.crypto ?? require("node:crypto").webcrypto).getRandomValues(bytes);
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}
export function slugify(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
export function generateSlug(name: string): string {
  return `${slugify(name)}-${shortId(4)}`;
}
```
`src/domain/whatsapp.ts`:
```ts
import { WHATSAPP_NUMBER } from "@mogadget/contracts/constants";
import { formatNaira } from "./naira";
export function buildWhatsAppLink(p: { name: string; priceNaira: number; url?: string }): string {
  const base = `Hi, I'm interested in the ${p.name} (${formatNaira(p.priceNaira)}) listed on MoGadget`;
  const msg = p.url ? `${base} — ${p.url}` : base;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}
```
`src/domain/product.ts`:
```ts
import type { TCondition, TCosmeticGrade, TStatus, TStockType } from "@mogadget/contracts/types";
import { ErrInvalidFields } from "../constants/errors";

export interface IProductInvariantInput {
  condition: TCondition; cosmeticGrade: TCosmeticGrade | null;
  stockType: TStockType; status: TStatus; quantity: number | null; priceNaira: number;
}
export function deriveStatusFromQuantity(quantity: number): Extract<TStatus, "IN_STOCK" | "OUT_OF_STOCK"> {
  return quantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK";
}
export function assertProductInvariants(p: IProductInvariantInput): void {
  const isNew = p.condition === "NEW";
  const restockStatuses: TStatus[] = ["IN_STOCK", "OUT_OF_STOCK"];
  const uniqueStatuses: TStatus[] = ["AVAILABLE", "SOLD"];
  const bad = (): never => { throw ErrInvalidFields; };
  if (!Number.isInteger(p.priceNaira) || p.priceNaira <= 0) bad();
  if (isNew) {
    if (p.cosmeticGrade !== null) bad();
    if (p.stockType !== "RESTOCKABLE") bad();
    if (!restockStatuses.includes(p.status)) bad();
    if (p.quantity === null || p.quantity < 0) bad();
  } else {
    if (p.cosmeticGrade === null) bad();
    if (p.stockType !== "UNIQUE_UNIT") bad();
    if (!uniqueStatuses.includes(p.status)) bad();
    if (p.quantity !== null) bad();
  }
}
```
`src/domain/index.ts`: `export * from "./product"; export * from "./slug"; export * from "./naira"; export * from "./whatsapp";`

- [ ] **Step 6: Run domain tests, verify pass; set `src/index.ts`**

`src/index.ts` (initial): `export * from "./constants"; export * from "./domain"; export * as response from "./lib/response";`
Run: `yarn vitest run packages/core/src/domain` — Expected: PASS (all suites).

- [ ] **Step 7: Commit**

```bash
git add packages/core
git commit -m "feat(core): error sentinels, response envelope, product domain layer (TDD)"
```

---

### Task 5: `@mogadget/core` — databases (Mongo + Redis with glob-SCAN invalidation)

**Files:**
- Create: `src/databases/{index.ts,mongoDB.ts,redis.ts}`, `src/metrics/index.ts`, `src/lib/{logger.ts,clientIp.ts}`
- Test: `src/databases/redis.test.ts`

**Interfaces:**
- Produces:
  - `connectMongoDB(): Promise<void>` (idempotent, caches connection on `global`), `disconnectMongoDB()`.
  - `redis` (ioredis singleton), `connectRedis()`, `redisRetrieveKeyString<T>(key)`, `redisUpdateKeyString<T>(key,data,expire,seconds)`, `redisDeleteKeys(...patterns): Promise<number>`, `redisGet/redisSet/redisDel/redisIncr`.
  - `databaseResponseTimeHistogram`, `restResponseTimeHistogram`, `IOperationType`.
  - `getLogger()`, `clientIp(req)`.

- [ ] **Step 1: Write `src/metrics/index.ts`, `src/lib/logger.ts`, `src/lib/clientIp.ts`**

`metrics/index.ts`:
```ts
import client from "prom-client";
export enum IOperationType { Read = "read", Write = "write" }
const reg = client.register;
export const databaseResponseTimeHistogram =
  (reg.getSingleMetric("db_response_seconds") as client.Histogram<string>) ??
  new client.Histogram({ name: "db_response_seconds", help: "DB op time",
    labelNames: ["operation","collection","method","success"], buckets: [0.01,0.05,0.1,0.5,1] });
export const restResponseTimeHistogram =
  (reg.getSingleMetric("rest_response_seconds") as client.Histogram<string>) ??
  new client.Histogram({ name: "rest_response_seconds", help: "REST time",
    labelNames: ["method","route","status_code"], buckets: [0.05,0.1,0.5,1,3] });
```
`lib/logger.ts`:
```ts
import pino from "pino";
let logger: pino.Logger | undefined;
export function getLogger(): pino.Logger { return (logger ??= pino({ level: process.env.LOG_LEVEL ?? "info" })); }
```
`lib/clientIp.ts`:
```ts
export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}
```

- [ ] **Step 2: Write `src/databases/mongoDB.ts`**

```ts
import mongoose from "mongoose";
import { env } from "../constants/environments";
declare global { var __mogadgetMongo: Promise<typeof mongoose> | undefined; }
export async function connectMongoDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (!globalThis.__mogadgetMongo) globalThis.__mogadgetMongo = mongoose.connect(env.mongoUri);
  await globalThis.__mogadgetMongo;
}
export async function disconnectMongoDB(): Promise<void> {
  await mongoose.disconnect(); globalThis.__mogadgetMongo = undefined;
}
```

- [ ] **Step 3: Write `src/databases/redis.ts`**

```ts
import Redis from "ioredis";
import { env } from "../constants/environments";
declare global { var __mogadgetRedis: Redis | undefined; }
export const redis: Redis = globalThis.__mogadgetRedis ?? new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2 });
if (!globalThis.__mogadgetRedis) globalThis.__mogadgetRedis = redis;

export async function connectRedis(): Promise<void> {
  if (redis.status === "ready") return;
  await redis.connect().catch(() => { /* connect() throws if already connecting */ });
  await Promise.race([
    redis.ping(),
    new Promise((_, rej) => setTimeout(() => rej(new Error("redis ping timeout")), 5000)),
  ]);
}
export async function redisUpdateKeyString<T>(key: string, data: T, expire = true, seconds = 60): Promise<void> {
  const payload = JSON.stringify(data);
  if (expire) await redis.setex(key, seconds, payload); else await redis.set(key, payload);
}
export async function redisRetrieveKeyString<T>(key: string): Promise<T | undefined> {
  const raw = await redis.get(key);
  if (raw == null) return undefined;
  try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
}
async function scanMatching(pattern: string): Promise<string[]> {
  const found: string[] = []; let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 250);
    cursor = next; found.push(...keys);
  } while (cursor !== "0");
  return found;
}
export async function redisDeleteKeys(...patterns: string[]): Promise<number> {
  const keys = new Set<string>();
  for (const p of patterns) {
    if (p.includes("*")) for (const k of await scanMatching(p)) keys.add(k);
    else keys.add(p);
  }
  if (keys.size === 0) return 0;
  const arr = Array.from(keys); let removed = 0;
  for (let i = 0; i < arr.length; i += 500) removed += await redis.del(...arr.slice(i, i + 500));
  return removed;
}
export const redisGet = (k: string) => redis.get(k);
export const redisSet = (k: string, v: string, ttl?: number) => (ttl ? redis.setex(k, ttl, v) : redis.set(k, v));
export const redisDel = (k: string) => redis.del(k);
export const redisIncr = (k: string) => redis.incr(k);
```
`databases/index.ts`: `export * from "./mongoDB"; export * from "./redis";`

- [ ] **Step 4: Write the failing Redis test `src/databases/redis.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { redis, connectRedis, redisUpdateKeyString, redisRetrieveKeyString, redisDeleteKeys } from "./redis";

describe("redis cache helpers", () => {
  beforeAll(async () => { await connectRedis(); });
  afterAll(async () => { await redis.flushdb(); await redis.quit(); });
  it("round-trips a JSON value", async () => {
    await redisUpdateKeyString("t:one", { a: 1 }, true, 30);
    expect(await redisRetrieveKeyString<{ a: number }>("t:one")).toEqual({ a: 1 });
  });
  it("deletes by glob via SCAN", async () => {
    await redisUpdateKeyString("t:list:a", [1], true, 30);
    await redisUpdateKeyString("t:list:b", [2], true, 30);
    const removed = await redisDeleteKeys("t:list:*");
    expect(removed).toBe(2);
    expect(await redisRetrieveKeyString("t:list:a")).toBeUndefined();
  });
});
```
Add a scripts note to the plan reader: **this test needs a running Redis** — `docker run --rm -d -p 6379:6379 redis:7-alpine`.

- [ ] **Step 5: Run it, verify pass**

Run: `yarn vitest run packages/core/src/databases/redis.test.ts`
Expected: PASS (Redis running). If Redis is down, expect a connect error — start Redis and rerun.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/databases packages/core/src/metrics packages/core/src/lib/logger.ts packages/core/src/lib/clientIp.ts
git commit -m "feat(core): Mongo + Redis singletons, glob-SCAN invalidation, metrics, logger"
```

---

### Task 6: `@mogadget/core` — session, validation, password, request context, handler

**Files:**
- Create: `src/lib/{session.ts,validation.ts,password.ts,requestContext.ts,handler.ts,index.ts}`
- Test: `src/lib/session.test.ts`, `src/lib/validation.test.ts`

**Interfaces:**
- Produces:
  - `session`: `ISessionPayload = { sub: string; username: string; perms?: string[] }`; `signSession(payload, maxAgeSeconds)`, `verifySession(token): Promise<ISessionPayload | null>`.
  - `validation`: `validateBody<T>(req, schema, opts?): Promise<T>` (throws `ErrInvalidJson`/`ErrInvalidFields`), `parseOrThrow<T>(schema, data): T`.
  - `password`: `hashPassword(pw)`, `verifyPassword(hash, pw)`.
  - `requestContext`: `runWithRequestContext(ctx, fn)`, `getSessionUser()`, `getRequestId()`, cookie queue `issueSessionCookie`/`revokeSessionCookie`, `getQueuedCookies()`.
  - `handler`: `withApiHandler<TCtx>(options, handler): TBaseHandler<TCtx>`, types `THandler`, `TBaseHandler`, `IHandlerOptions`.

- [ ] **Step 1: Write `src/lib/password.ts` and `src/lib/session.ts`**

`password.ts`:
```ts
import argon2 from "argon2";
export const hashPassword = (pw: string) => argon2.hash(pw, { type: argon2.argon2id });
export const verifyPassword = (hash: string, pw: string) => argon2.verify(hash, pw).catch(() => false);
```
`session.ts`:
```ts
import { SignJWT, jwtVerify } from "jose";
import { env } from "../constants/environments";
export interface ISessionPayload { sub: string; username: string; perms?: string[]; }
const secret = () => new TextEncoder().encode(env.sessionSecret);
export async function signSession(payload: ISessionPayload, maxAgeSeconds = env.sessionMaxAgeSeconds): Promise<string> {
  return new SignJWT({ username: payload.username, perms: payload.perms })
    .setProtectedHeader({ alg: "HS256" }).setSubject(payload.sub)
    .setIssuedAt().setExpirationTime(`${maxAgeSeconds}s`).sign(secret());
}
export async function verifySession(token: string): Promise<ISessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return { sub: String(payload.sub), username: String(payload.username), perms: payload.perms as string[] | undefined };
  } catch { return null; }
}
```

- [ ] **Step 2: Write `src/lib/session.test.ts` (failing), run, implement is already there → pass**

```ts
import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "./session";
describe("session jwt", () => {
  it("round-trips a payload", async () => {
    const t = await signSession({ sub: "u1", username: "owner", perms: ["products:write"] }, 60);
    const p = await verifySession(t);
    expect(p?.sub).toBe("u1"); expect(p?.perms).toEqual(["products:write"]);
  });
  it("rejects a tampered token", async () => { expect(await verifySession("nope.nope.nope")).toBeNull(); });
});
```
Run: `yarn vitest run packages/core/src/lib/session.test.ts` — Expected: PASS.

- [ ] **Step 3: Write `src/lib/requestContext.ts`**

```ts
import { AsyncLocalStorage } from "node:async_hooks";
import type { ISessionPayload } from "./session";
export interface IQueuedCookie { name: string; value: string; maxAge: number; }
export interface IRequestContext { session: ISessionPayload | null; requestId: string; cookies: IQueuedCookie[]; }
const als = new AsyncLocalStorage<IRequestContext>();
export function runWithRequestContext<T>(ctx: IRequestContext, fn: () => Promise<T>): Promise<T> { return als.run(ctx, fn); }
export function getSessionUser(): ISessionPayload | null { return als.getStore()?.session ?? null; }
export function getRequestId(): string { return als.getStore()?.requestId ?? "-"; }
export function issueSessionCookie(name: string, value: string, maxAge: number): void { als.getStore()?.cookies.push({ name, value, maxAge }); }
export function revokeSessionCookie(name: string): void { als.getStore()?.cookies.push({ name, value: "", maxAge: 0 }); }
export function getQueuedCookies(): IQueuedCookie[] { return als.getStore()?.cookies ?? []; }
```

- [ ] **Step 4: Write `src/lib/validation.ts` + test (failing → pass)**

`validation.ts`:
```ts
import type { ZodSchema } from "zod";
import { ErrInvalidFields, ErrInvalidJson } from "../constants/errors";
export async function validateBody<T>(req: Request, schema: ZodSchema<T>, opts?: { patch?: boolean }): Promise<T> {
  let raw: unknown;
  try { raw = await req.json(); } catch { throw ErrInvalidJson; }
  if (opts?.patch && raw && typeof raw === "object" && "patch" in (raw as object)) raw = (raw as { patch: unknown }).patch;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw ErrInvalidFields;
  return parsed.data;
}
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw ErrInvalidFields;
  return parsed.data;
}
```
`validation.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateBody } from "./validation";
const schema = z.object({ channel: z.enum(["whatsapp","instagram"]) });
const req = (body: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(body) });
describe("validateBody", () => {
  it("returns typed data on valid input", async () => {
    expect(await validateBody(req({ channel: "whatsapp" }), schema)).toEqual({ channel: "whatsapp" });
  });
  it("throws on invalid input", async () => {
    await expect(validateBody(req({ channel: "sms" }), schema)).rejects.toMatchObject({ code: 400 });
  });
});
```
Run: `yarn vitest run packages/core/src/lib/validation.test.ts` — Expected: PASS.

- [ ] **Step 5: Write `src/lib/handler.ts` and `src/lib/index.ts`**

`handler.ts`:
```ts
import { clientIp } from "./clientIp";
import { redisIncr, redis } from "../databases/redis";
import { restResponseTimeHistogram } from "../metrics";
import { fail, handleError, type IEnvelope } from "./response";
import { ErrRateLimited } from "../constants/errors";

export type THandler = (req: Request) => Promise<IEnvelope>;
export type TBaseHandler<TCtx = unknown> = (req: Request, ctx: TCtx) => Promise<IEnvelope>;
export interface IHandlerOptions { route: string; rateLimit?: { max: number; windowSeconds: number }; }

async function consume(ip: string, route: string, max: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const key = `rl:${route}:${ip}`;
  const count = await redisIncr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  const ttl = await redis.ttl(key);
  return { allowed: count <= max, remaining: Math.max(0, max - count), retryAfter: ttl < 0 ? windowSeconds : ttl };
}
export function withApiHandler<TCtx = unknown>(options: IHandlerOptions, handler: TBaseHandler<TCtx>): TBaseHandler<TCtx> {
  const max = options.rateLimit?.max ?? 100;
  const windowSeconds = options.rateLimit?.windowSeconds ?? 60;
  return async (req, ctx) => {
    const ip = clientIp(req);
    const start = process.hrtime.bigint();
    let response: IEnvelope;
    try {
      const rl = await consume(ip, options.route, max, windowSeconds);
      if (!rl.allowed) {
        response = fail(ErrRateLimited.code, `Too many requests. Try again in ${rl.retryAfter}s`);
        response.headers = { "Retry-After": String(rl.retryAfter), "X-RateLimit-Remaining": "0" };
      } else {
        response = await handler(req, ctx);
        response.headers = { ...response.headers, "X-RateLimit-Remaining": String(rl.remaining) };
      }
    } catch (err) { response = handleError(err); }
    const elapsed = Number(process.hrtime.bigint() - start) / 1e9;
    restResponseTimeHistogram.observe({ method: req.method, route: options.route, status_code: String(response.status) }, elapsed);
    return response;
  };
}
```
`lib/index.ts`: `export * from "./response"; export * from "./handler"; export * from "./session"; export * from "./requestContext"; export * from "./validation"; export * from "./password"; export * from "./clientIp"; export * from "./logger";`

- [ ] **Step 6: Run all core tests + ts.check**

Run: `yarn vitest run packages/core && yarn workspace @mogadget/core ts.check`
Expected: PASS + no TS errors.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/lib
git commit -m "feat(core): session (jose), password (argon2), request-context ALS, validation, withApiHandler"
```

---

### Task 7: `@mogadget/core` — `products` model

**Files:**
- Create: `src/models/utils.ts`, `src/models/products/{index.ts,types.ts}`
- Test: `src/models/products/products.test.ts`

**Interfaces:**
- Consumes: `assertProductInvariants`, `deriveStatusFromQuantity` (domain), `databaseResponseTimeHistogram`, `IOperationType`.
- Produces: `IProduct`, `IProductCreateInput`, `IProductUpdateInput`, `IProductImage`, `IProductSpec`; `*DB` fns: `listProductsDB`, `productFacetsDB`, `getProductBySlugDB`, `getProductBySlugAnyStatusDB`, `getProductByIdDB`, `createProductDB`, `updateProductByIdDB`, `deleteProductByIdDB`, `countProductsDB`, `incrementClickDB`.

- [ ] **Step 1: Write `src/models/products/types.ts`**

```ts
import type { TCategory, TCondition, TCosmeticGrade, TStatus, TStockType, TClickChannel } from "@mogadget/contracts/types";
export interface IProductImage { key: string; sortOrder: number; }
export interface IProductSpec { label: string; value: string; }
export interface IProduct {
  _id: string; slug: string; name: string; category: TCategory; brand: string;
  condition: TCondition; cosmeticGrade: TCosmeticGrade | null; priceNaira: number;
  description: string | null; stockType: TStockType; status: TStatus; quantity: number | null;
  isVisible: boolean; images: IProductImage[]; specs: IProductSpec[];
  whatsappClickCount: number; instagramClickCount: number;
  createdAt: Date; updatedAt: Date;
}
export interface IProductCreateInput {
  slug: string; name: string; category: TCategory; brand: string; condition: TCondition;
  cosmeticGrade: TCosmeticGrade | null; priceNaira: number; description?: string | null;
  stockType: TStockType; status: TStatus; quantity?: number | null;
  isVisible?: boolean; images?: IProductImage[]; specs?: IProductSpec[];
}
export type IProductUpdateInput = Partial<Omit<IProductCreateInput, "slug">>;
export interface IProductListFilter {
  category?: TCategory; q?: string; condition?: TCondition[]; brand?: string[];
  min?: number; max?: number; sort?: "newest" | "price_asc" | "price_desc";
  includeHidden?: boolean; status?: "public" | "all"; limit?: number;
}
export type { TClickChannel };
```

- [ ] **Step 2: Write `src/models/utils.ts`**

```ts
export enum IOperationType { Read = "read", Write = "write" }
```
> If `IOperationType` already exists in `metrics/index.ts`, import from there instead and delete this duplicate. Use one definition: keep it in `metrics/index.ts` and re-export from `models/utils.ts`: `export { IOperationType } from "../metrics";`

- [ ] **Step 3: Write `src/models/products/index.ts`**

```ts
import mongoose, { type Model } from "mongoose";
import { databaseResponseTimeHistogram, IOperationType } from "../../metrics";
import type { IProduct, IProductCreateInput, IProductUpdateInput, IProductListFilter, TClickChannel } from "./types";

const collectionName = "products";
const ImageSchema = new mongoose.Schema({ key: String, sortOrder: { type: Number, default: 0 } }, { _id: false });
const SpecSchema = new mongoose.Schema({ label: String, value: String }, { _id: false });
const ProductSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: ["PHONES","LAPTOPS","AUDIO","WEARABLES","CONSOLES","OTHER"] },
    brand: { type: String, required: true, trim: true },
    condition: { type: String, required: true, enum: ["NEW","UK_USED","US_USED","NG_USED"] },
    cosmeticGrade: { type: String, enum: ["A","B","C",null], default: null },
    priceNaira: { type: Number, required: true, min: 1 },
    description: { type: String, default: null },
    stockType: { type: String, required: true, enum: ["RESTOCKABLE","UNIQUE_UNIT"] },
    status: { type: String, required: true, enum: ["IN_STOCK","OUT_OF_STOCK","AVAILABLE","SOLD"] },
    quantity: { type: Number, default: null },
    isVisible: { type: Boolean, default: true },
    images: { type: [ImageSchema], default: [] },
    specs: { type: [SpecSchema], default: [] },
    whatsappClickCount: { type: Number, default: 0 },
    instagramClickCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: collectionName },
);
ProductSchema.index({ isVisible: 1, category: 1, condition: 1, priceNaira: 1 });
ProductSchema.index({ name: "text", brand: "text", description: "text" });

export const Product: Model<IProduct> =
  (mongoose.models.Product as Model<IProduct>) || mongoose.model<IProduct>("Product", ProductSchema);

const PUBLIC_STATUS = { isVisible: true } as const;
const SORTS = { newest: { createdAt: -1 }, price_asc: { priceNaira: 1 }, price_desc: { priceNaira: -1 } } as const;

export async function listProductsDB(f: IProductListFilter = {}): Promise<IProduct[]> {
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    const query: Record<string, unknown> = {};
    if (f.status !== "all") Object.assign(query, PUBLIC_STATUS);
    else if (!f.includeHidden) Object.assign(query, PUBLIC_STATUS);
    if (f.category) query.category = f.category;
    if (f.condition?.length) query.condition = { $in: f.condition };
    if (f.brand?.length) query.brand = { $in: f.brand };
    if (f.min != null || f.max != null) query.priceNaira = { ...(f.min != null && { $gte: f.min }), ...(f.max != null && { $lte: f.max }) };
    if (f.q) query.$text = { $search: f.q };
    const sold = { $expr: { $in: ["$status", ["SOLD","OUT_OF_STOCK"]] } };
    const result = await Product.find(query)
      .sort({ ...(sold ? {} : {}), ...SORTS[f.sort ?? "newest"] })
      .limit(f.limit ?? 60).lean<IProduct[]>();
    // SOLD/OOS always sink below available (product doc §5.2)
    const rank = (p: IProduct) => (p.status === "SOLD" || p.status === "OUT_OF_STOCK" ? 1 : 0);
    result.sort((a, b) => rank(a) - rank(b));
    timer({ operation: IOperationType.Read, collection: collectionName, method: "listProductsDB", success: "true" });
    return result;
  } catch { timer({ operation: IOperationType.Read, collection: collectionName, method: "listProductsDB", success: "false" }); return []; }
}
export async function getProductBySlugDB({ slug }: { slug: string }): Promise<IProduct | null> {
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    const r = await Product.findOne({ slug, isVisible: true }).lean<IProduct>();
    timer({ operation: IOperationType.Read, collection: collectionName, method: "getProductBySlugDB", success: r ? "true" : "false" });
    return r;
  } catch { timer({ operation: IOperationType.Read, collection: collectionName, method: "getProductBySlugDB", success: "false" }); return null; }
}
export async function getProductBySlugAnyStatusDB({ slug }: { slug: string }): Promise<IProduct | null> {
  try { return await Product.findOne({ slug }).lean<IProduct>(); } catch { return null; }
}
export async function getProductByIdDB({ id }: { id: string }): Promise<IProduct | null> {
  try { return await Product.findById(id).lean<IProduct>(); } catch { return null; }
}
export async function createProductDB(input: IProductCreateInput): Promise<IProduct | null> {
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    const doc = (await Product.create([input]))[0]!;
    timer({ operation: IOperationType.Write, collection: collectionName, method: "createProductDB", success: "true" });
    return doc.toObject() as IProduct;
  } catch { timer({ operation: IOperationType.Write, collection: collectionName, method: "createProductDB", success: "false" }); return null; }
}
export async function updateProductByIdDB({ id, patch }: { id: string; patch: IProductUpdateInput }): Promise<IProduct | null> {
  try { return await Product.findByIdAndUpdate(id, { $set: patch }, { returnDocument: "after" }).lean<IProduct>(); } catch { return null; }
}
export async function deleteProductByIdDB({ id }: { id: string }): Promise<boolean> {
  try { return (await Product.deleteOne({ _id: id })).deletedCount > 0; } catch { return false; }
}
export async function countProductsDB(f: IProductListFilter = {}): Promise<number> {
  try { return await Product.countDocuments(f.category ? { isVisible: true, category: f.category } : { isVisible: true }); } catch { return 0; }
}
export async function productFacetsDB(): Promise<{ categories: Record<string, number>; conditions: Record<string, number> }> {
  try {
    const [cats, conds] = await Promise.all([
      Product.aggregate([{ $match: { isVisible: true } }, { $group: { _id: "$category", n: { $sum: 1 } } }]),
      Product.aggregate([{ $match: { isVisible: true } }, { $group: { _id: "$condition", n: { $sum: 1 } } }]),
    ]);
    const toMap = (rows: { _id: string; n: number }[]) => Object.fromEntries(rows.map((r) => [r._id, r.n]));
    return { categories: toMap(cats), conditions: toMap(conds) };
  } catch { return { categories: {}, conditions: {} }; }
}
export async function incrementClickDB({ slug, channel }: { slug: string; channel: TClickChannel }): Promise<boolean> {
  try {
    const field = channel === "whatsapp" ? "whatsappClickCount" : "instagramClickCount";
    const r = await Product.updateOne({ slug }, { $inc: { [field]: 1 } });
    return r.matchedCount > 0;
  } catch { return false; }
}
export default Product;
export * from "./types";
```

- [ ] **Step 4: Write the failing model test `src/models/products/products.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../../databases/mongoDB";
import { createProductDB, getProductBySlugDB, incrementClickDB, listProductsDB, Product } from "./index";

const p = { slug: "iphone-13-test-ab12", name: "iPhone 13", category: "PHONES", brand: "iPhone",
  condition: "UK_USED", cosmeticGrade: "A", priceNaira: 485000, stockType: "UNIQUE_UNIT",
  status: "AVAILABLE", quantity: null, isVisible: true } as const;

describe("products model *DB", () => {
  beforeAll(async () => { await connectMongoDB(); await Product.deleteMany({ slug: /test/ }); });
  afterAll(async () => { await Product.deleteMany({ slug: /test/ }); await disconnectMongoDB(); });
  it("creates and reads by slug", async () => {
    const created = await createProductDB(p);
    expect(created?.slug).toBe(p.slug);
    expect((await getProductBySlugDB({ slug: p.slug }))?.name).toBe("iPhone 13");
  });
  it("increments a click counter by slug", async () => {
    expect(await incrementClickDB({ slug: p.slug, channel: "whatsapp" })).toBe(true);
    expect((await getProductBySlugDB({ slug: p.slug }))?.whatsappClickCount).toBe(1);
  });
  it("hides invisible products from public list", async () => {
    await Product.updateOne({ slug: p.slug }, { $set: { isVisible: false } });
    const list = await listProductsDB({ status: "public" });
    expect(list.find((x) => x.slug === p.slug)).toBeUndefined();
  });
});
```
> Needs a running Mongo — `docker run --rm -d -p 27017:27017 mongo:7`.

- [ ] **Step 5: Run it, verify pass**

Run: `yarn vitest run packages/core/src/models/products/products.test.ts`
Expected: PASS (Mongo running).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/models/products packages/core/src/models/utils.ts
git commit -m "feat(core): products model with *DB operation functions"
```

---

### Task 8: `@mogadget/core` — IAM & audit models (`users`, `policies`, `groups`, `adminAuditLogs`)

**Files:**
- Create: `src/models/users/{index.ts,types.ts}`, `src/models/policies/{index.ts,types.ts}`, `src/models/groups/{index.ts,types.ts}`, `src/models/adminAuditLogs/{index.ts,types.ts}`, `src/models/index.ts`
- Test: `src/models/iam.test.ts`

**Interfaces:**
- Produces:
  - `users`: `IUser` (`_id, username, passwordHash, attachedPolicyIds[], groupIds[], createdAt`), `getUserByUsernameDB`, `getUserByIdDB`, `createUserDB`, `upsertUserByUsernameDB`.
  - `policies`: `IPolicy` (`_id, name, managed, statements[]`), `upsertPolicyByNameDB`, `getPolicyByNameDB`, `listPoliciesByIdsDB`.
  - `groups`: `IGroup` (`_id, name, managed, policyIds[], statements[]`), `upsertGroupByNameDB`, `getGroupByNameDB`, `listGroupsByIdsDB`.
  - `adminAuditLogs`: `IAdminAuditLog`, `createAuditLogDB`, `listAuditLogsDB`.
  - `src/models/index.ts` re-exports all model modules.

- [ ] **Step 1: Write the four `types.ts` files**

`users/types.ts`:
```ts
export interface IUser { _id: string; username: string; passwordHash: string; attachedPolicyIds: string[]; groupIds: string[]; createdAt: Date; updatedAt: Date; }
export interface IUserCreateInput { username: string; passwordHash: string; groupIds?: string[]; attachedPolicyIds?: string[]; }
```
`policies/types.ts`:
```ts
import type { IPolicyStatement } from "@mogadget/contracts/iam";
export interface IPolicy { _id: string; name: string; managed: boolean; statements: IPolicyStatement[]; }
```
`groups/types.ts`:
```ts
import type { IPolicyStatement } from "@mogadget/contracts/iam";
export interface IGroup { _id: string; name: string; managed: boolean; policyIds: string[]; statements: IPolicyStatement[]; }
```
`adminAuditLogs/types.ts`:
```ts
export interface IAdminAuditLog { _id: string; userId: string | null; action: string; targetType?: string; targetId?: string; responseCode: number; durationMs: number; body?: unknown; createdAt: Date; }
export interface IAuditCreateInput { userId: string | null; action: string; targetType?: string; targetId?: string; responseCode: number; durationMs: number; body?: unknown; }
```

- [ ] **Step 2: Write `policies/index.ts` and `groups/index.ts`**

`policies/index.ts`:
```ts
import mongoose, { type Model } from "mongoose";
import type { IPolicy } from "./types";
const StatementSchema = new mongoose.Schema({ effect: { type: String, enum: ["Allow","Deny"], required: true }, actions: { type: [String], required: true } }, { _id: false });
const PolicySchema = new mongoose.Schema({ name: { type: String, required: true, unique: true }, managed: { type: Boolean, default: false }, statements: { type: [StatementSchema], default: [] } }, { timestamps: true, collection: "policies" });
export const Policy: Model<IPolicy> = (mongoose.models.Policy as Model<IPolicy>) || mongoose.model<IPolicy>("Policy", PolicySchema);
export async function upsertPolicyByNameDB(p: { name: string; managed: boolean; statements: IPolicy["statements"] }): Promise<IPolicy | null> {
  try { return await Policy.findOneAndUpdate({ name: p.name }, { $set: p }, { returnDocument: "after", upsert: true }).lean<IPolicy>(); } catch { return null; }
}
export async function getPolicyByNameDB({ name }: { name: string }): Promise<IPolicy | null> { try { return await Policy.findOne({ name }).lean<IPolicy>(); } catch { return null; } }
export async function listPoliciesByIdsDB({ ids }: { ids: string[] }): Promise<IPolicy[]> { try { return await Policy.find({ _id: { $in: ids } }).lean<IPolicy[]>(); } catch { return []; } }
export default Policy; export * from "./types";
```
`groups/index.ts`:
```ts
import mongoose, { type Model } from "mongoose";
import type { IGroup } from "./types";
const StatementSchema = new mongoose.Schema({ effect: { type: String, enum: ["Allow","Deny"], required: true }, actions: { type: [String], required: true } }, { _id: false });
const GroupSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true }, managed: { type: Boolean, default: false }, policyIds: { type: [mongoose.Schema.Types.ObjectId], default: [] }, statements: { type: [StatementSchema], default: [] } }, { timestamps: true, collection: "groups" });
export const Group: Model<IGroup> = (mongoose.models.Group as Model<IGroup>) || mongoose.model<IGroup>("Group", GroupSchema);
export async function upsertGroupByNameDB(g: { name: string; managed: boolean; policyIds: string[]; statements?: IGroup["statements"] }): Promise<IGroup | null> {
  try { return await Group.findOneAndUpdate({ name: g.name }, { $set: { ...g, statements: g.statements ?? [] } }, { returnDocument: "after", upsert: true }).lean<IGroup>(); } catch { return null; }
}
export async function getGroupByNameDB({ name }: { name: string }): Promise<IGroup | null> { try { return await Group.findOne({ name }).lean<IGroup>(); } catch { return null; } }
export async function listGroupsByIdsDB({ ids }: { ids: string[] }): Promise<IGroup[]> { try { return await Group.find({ _id: { $in: ids } }).lean<IGroup[]>(); } catch { return []; } }
export default Group; export * from "./types";
```

- [ ] **Step 3: Write `users/index.ts` and `adminAuditLogs/index.ts`**

`users/index.ts`:
```ts
import mongoose, { type Model } from "mongoose";
import type { IUser, IUserCreateInput } from "./types";
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  attachedPolicyIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  groupIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
}, { timestamps: true, collection: "users" });
export const User: Model<IUser> = (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>("User", UserSchema);
export async function getUserByUsernameDB({ username }: { username: string }): Promise<IUser | null> { try { return await User.findOne({ username }).lean<IUser>(); } catch { return null; } }
export async function getUserByIdDB({ id }: { id: string }): Promise<IUser | null> { try { return await User.findById(id).lean<IUser>(); } catch { return null; } }
export async function createUserDB(input: IUserCreateInput): Promise<IUser | null> { try { return (await User.create([input]))[0]!.toObject() as IUser; } catch { return null; } }
export async function upsertUserByUsernameDB(input: IUserCreateInput): Promise<IUser | null> {
  try { return await User.findOneAndUpdate({ username: input.username }, { $set: input }, { returnDocument: "after", upsert: true }).lean<IUser>(); } catch { return null; }
}
export default User; export * from "./types";
```
`adminAuditLogs/index.ts`:
```ts
import mongoose, { type Model } from "mongoose";
import type { IAdminAuditLog, IAuditCreateInput } from "./types";
const AuditSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, default: null },
  action: { type: String, required: true }, targetType: String, targetId: String,
  responseCode: Number, durationMs: Number, body: mongoose.Schema.Types.Mixed,
}, { timestamps: { createdAt: true, updatedAt: false }, collection: "admin_audit_logs" });
export const AdminAuditLog: Model<IAdminAuditLog> = (mongoose.models.AdminAuditLog as Model<IAdminAuditLog>) || mongoose.model<IAdminAuditLog>("AdminAuditLog", AuditSchema);
export async function createAuditLogDB(input: IAuditCreateInput): Promise<void> { try { await AdminAuditLog.create([input]); } catch { /* audit is best-effort */ } }
export async function listAuditLogsDB({ limit = 100 }: { limit?: number } = {}): Promise<IAdminAuditLog[]> { try { return await AdminAuditLog.find().sort({ createdAt: -1 }).limit(limit).lean<IAdminAuditLog[]>(); } catch { return []; } }
export default AdminAuditLog; export * from "./types";
```

- [ ] **Step 4: Write `src/models/index.ts`**

```ts
export * as products from "./products";
export * as users from "./users";
export * as policies from "./policies";
export * as groups from "./groups";
export * as adminAuditLogs from "./adminAuditLogs";
```

- [ ] **Step 5: Write the IAM model test (failing → pass)**

`src/models/iam.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../databases/mongoDB";
import { upsertPolicyByNameDB, Policy } from "./policies";
import { upsertGroupByNameDB, Group } from "./groups";
import { upsertUserByUsernameDB, User } from "./users";

describe("iam models upsert", () => {
  beforeAll(async () => { await connectMongoDB(); });
  afterAll(async () => { await Promise.all([Policy.deleteMany({ name: /Test/ }), Group.deleteMany({ name: /Test/ }), User.deleteMany({ username: /test/ })]); await disconnectMongoDB(); });
  it("upserts a policy idempotently by name", async () => {
    const a = await upsertPolicyByNameDB({ name: "TestAdmin", managed: true, statements: [{ effect: "Allow", actions: ["*"] }] });
    const b = await upsertPolicyByNameDB({ name: "TestAdmin", managed: true, statements: [{ effect: "Allow", actions: ["*"] }] });
    expect(a?._id).toBeDefined(); expect(String(a?._id)).toBe(String(b?._id));
  });
  it("attaches a group to a user", async () => {
    const g = await upsertGroupByNameDB({ name: "TestGroup", managed: true, policyIds: [] });
    const u = await upsertUserByUsernameDB({ username: "test-owner", passwordHash: "x", groupIds: [String(g?._id)] });
    expect(u?.groupIds.map(String)).toContain(String(g?._id));
  });
});
```
Run: `yarn vitest run packages/core/src/models/iam.test.ts` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/models
git commit -m "feat(core): IAM (users/policies/groups) + admin audit log models"
```

---

### Task 9: `@mogadget/core` — products services (cache-aware) + invalidation

**Files:**
- Create: `src/services/products/{getProductBySlug.ts,listProducts.ts,productFacets.ts,createProduct.ts,updateProduct.ts,deleteProduct.ts,setStatus.ts,setVisibility.ts,incrementClick.ts,index.ts,utils/invalidateCacheKeys.ts}`, `src/services/index.ts`
- Test: `src/services/products/listProducts.test.ts`

**Interfaces:**
- Consumes: products `*DB` fns; redis helpers; domain `assertProductInvariants`, `generateSlug`.
- Produces (namespace `products.*`): `getProductBySlug({slug,refreshCache?})`, `listProducts(filter)`, `productFacets()`, `createProduct(input)`, `updateProduct({id,patch})`, `deleteProduct({id})`, `setStatus({id,status})`, `setVisibility({id,isVisible})`, `incrementClick({slug,channel})`. Each returns the same types as its `*DB` counterpart.

- [ ] **Step 1: Write `utils/invalidateCacheKeys.ts`**

```ts
import { redisDeleteKeys } from "../../../databases/redis";
import { getQueryKey as bySlugKey } from "../getProductBySlug";
import { FACETS_KEY } from "../productFacets";
export default async function invalidateCacheKeys({ slug }: { slug?: string } = {}): Promise<void> {
  const keys = ["services:products:listProducts:*", FACETS_KEY];
  if (slug) keys.push(bySlugKey({ slug }));
  await redisDeleteKeys(...keys);
}
```

- [ ] **Step 2: Write the read services**

`getProductBySlug.ts`:
```ts
import { getProductBySlugDB } from "../../models/products";
import type { IProduct } from "../../models/products/types";
import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases/redis";
const TTL = 5 * 60;
export function getQueryKey({ slug }: { slug: string }): string { return `services:products:getProductBySlug:${slug}`; }
export default async function getProductBySlug({ slug, refreshCache }: { slug: string; refreshCache?: boolean }): Promise<IProduct | null> {
  const key = getQueryKey({ slug });
  let result: IProduct | null = null;
  if (!refreshCache) result = (await redisRetrieveKeyString<IProduct>(key)) ?? null;
  if (!result) { result = await getProductBySlugDB({ slug }); if (result) await redisUpdateKeyString(key, result, true, TTL); }
  return result;
}
```
`listProducts.ts`:
```ts
import { listProductsDB } from "../../models/products";
import type { IProduct, IProductListFilter } from "../../models/products/types";
import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases/redis";
const TTL = 5 * 60;
const g = (v: unknown) => (v == null ? "*" : Array.isArray(v) ? v.join(",") : String(v));
export function getQueryKey(f: IProductListFilter): string {
  return `services:products:listProducts:${g(f.category)}:${g(f.q)}:${g(f.condition)}:${g(f.brand)}:${g(f.min)}:${g(f.max)}:${g(f.sort ?? "newest")}:${g(f.status ?? "public")}`;
}
export default async function listProducts(f: IProductListFilter = {}): Promise<IProduct[]> {
  const key = getQueryKey(f);
  const cached = await redisRetrieveKeyString<IProduct[]>(key);
  if (cached) return cached;
  const result = await listProductsDB(f);
  if (result.length > 0) await redisUpdateKeyString(key, result, true, TTL); // never cache empty
  return result;
}
```
`productFacets.ts`:
```ts
import { productFacetsDB } from "../../models/products";
import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases/redis";
export const FACETS_KEY = "services:products:productFacets";
const TTL = 5 * 60;
export default async function productFacets() {
  const cached = await redisRetrieveKeyString<Awaited<ReturnType<typeof productFacetsDB>>>(FACETS_KEY);
  if (cached) return cached;
  const result = await productFacetsDB();
  await redisUpdateKeyString(FACETS_KEY, result, true, TTL);
  return result;
}
```

- [ ] **Step 3: Write the write services**

`createProduct.ts`:
```ts
import { createProductDB } from "../../models/products";
import type { IProduct } from "../../models/products/types";
import type { TCreateProductInput } from "@mogadget/contracts/schemas";
import { assertProductInvariants, generateSlug } from "../../domain";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";
export default async function createProduct(input: TCreateProductInput): Promise<IProduct | null> {
  assertProductInvariants({ condition: input.condition, cosmeticGrade: input.cosmeticGrade ?? null, stockType: input.stockType, status: input.status, quantity: input.quantity ?? null, priceNaira: input.priceNaira });
  const slug = generateSlug(input.name);
  const doc = await createProductDB({ ...input, slug, cosmeticGrade: input.cosmeticGrade ?? null, description: input.description ?? null, quantity: input.quantity ?? null });
  if (doc) await invalidateCacheKeys({ slug });
  return doc;
}
```
`updateProduct.ts`:
```ts
import { getProductByIdDB, updateProductByIdDB } from "../../models/products";
import type { IProduct, IProductUpdateInput } from "../../models/products/types";
import { assertProductInvariants } from "../../domain";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";
const ALLOWED_KEYS: (keyof IProductUpdateInput)[] = ["name","category","brand","condition","cosmeticGrade","priceNaira","description","stockType","status","quantity","isVisible","images","specs"];
export default async function updateProduct({ id, patch }: { id: string; patch: IProductUpdateInput }): Promise<IProduct | null> {
  const existing = await getProductByIdDB({ id });
  if (!existing) return null;
  const clean: IProductUpdateInput = {};
  for (const k of ALLOWED_KEYS) if (k in patch) (clean as Record<string, unknown>)[k] = (patch as Record<string, unknown>)[k];
  const merged = { ...existing, ...clean };
  assertProductInvariants({ condition: merged.condition, cosmeticGrade: merged.cosmeticGrade, stockType: merged.stockType, status: merged.status, quantity: merged.quantity, priceNaira: merged.priceNaira });
  const doc = await updateProductByIdDB({ id, patch: clean });
  if (doc) await invalidateCacheKeys({ slug: doc.slug });
  return doc;
}
```
`setStatus.ts`, `setVisibility.ts`, `incrementClick.ts`, `deleteProduct.ts`:
```ts
// setStatus.ts
import { getProductByIdDB, updateProductByIdDB } from "../../models/products";
import type { IProduct } from "../../models/products/types";
import type { TStatus } from "@mogadget/contracts/types";
import { assertProductInvariants, deriveStatusFromQuantity } from "../../domain";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";
export default async function setStatus({ id, status }: { id: string; status: TStatus }): Promise<IProduct | null> {
  const existing = await getProductByIdDB({ id }); if (!existing) return null;
  assertProductInvariants({ ...existing, status });
  const doc = await updateProductByIdDB({ id, patch: { status } });
  if (doc) await invalidateCacheKeys({ slug: doc.slug });
  return doc;
}
```
```ts
// setVisibility.ts
import { getProductByIdDB, updateProductByIdDB } from "../../models/products";
import type { IProduct } from "../../models/products/types";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";
export default async function setVisibility({ id, isVisible }: { id: string; isVisible: boolean }): Promise<IProduct | null> {
  const existing = await getProductByIdDB({ id }); if (!existing) return null;
  const doc = await updateProductByIdDB({ id, patch: { isVisible } });
  if (doc) await invalidateCacheKeys({ slug: doc.slug });
  return doc;
}
```
```ts
// incrementClick.ts
import { incrementClickDB } from "../../models/products";
import type { TClickChannel } from "@mogadget/contracts/types";
import { getQueryKey as bySlugKey } from "./getProductBySlug";
import { redisDeleteKeys } from "../../databases/redis";
export default async function incrementClick({ slug, channel }: { slug: string; channel: TClickChannel }): Promise<boolean> {
  const ok = await incrementClickDB({ slug, channel });
  if (ok) await redisDeleteKeys(bySlugKey({ slug })); // refresh admin view; list cache untouched
  return ok;
}
```
```ts
// deleteProduct.ts
import { getProductByIdDB, deleteProductByIdDB } from "../../models/products";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";
export default async function deleteProduct({ id }: { id: string }): Promise<boolean> {
  const existing = await getProductByIdDB({ id }); if (!existing) return false;
  const ok = await deleteProductByIdDB({ id });
  if (ok) await invalidateCacheKeys({ slug: existing.slug });
  return ok;
}
```

- [ ] **Step 4: Write barrels `src/services/products/index.ts` and `src/services/index.ts`**

`services/products/index.ts`:
```ts
export { default as getProductBySlug } from "./getProductBySlug";
export { default as listProducts } from "./listProducts";
export { default as productFacets } from "./productFacets";
export { default as createProduct } from "./createProduct";
export { default as updateProduct } from "./updateProduct";
export { default as deleteProduct } from "./deleteProduct";
export { default as setStatus } from "./setStatus";
export { default as setVisibility } from "./setVisibility";
export { default as incrementClick } from "./incrementClick";
```
`services/index.ts`:
```ts
export * as products from "./products";
export * as iam from "./iam"; // added in Task 10
```
> Add the `iam` line only after Task 10 creates `services/iam`. For now, `export * as products from "./products";` alone.

- [ ] **Step 5: Write the failing service test `src/services/products/listProducts.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../../databases/mongoDB";
import { connectRedis, redis } from "../../databases/redis";
import { Product } from "../../models/products";
import createProduct from "./createProduct";
import listProducts from "./listProducts";
import { getQueryKey } from "./listProducts";

const input = { name: "Svc Test Phone", category: "PHONES", brand: "iPhone", condition: "UK_USED",
  cosmeticGrade: "A", priceNaira: 300000, stockType: "UNIQUE_UNIT", status: "AVAILABLE", quantity: null, specs: [], isVisible: true } as const;

describe("products service caching", () => {
  beforeAll(async () => { await connectMongoDB(); await connectRedis(); await Product.deleteMany({ name: /Svc Test/ }); await redis.flushdb(); });
  afterAll(async () => { await Product.deleteMany({ name: /Svc Test/ }); await redis.flushdb(); await redis.quit(); await disconnectMongoDB(); });
  it("caches a non-empty list under the globbable key", async () => {
    await createProduct(input as never);
    const first = await listProducts({ category: "PHONES" });
    expect(first.length).toBeGreaterThan(0);
    expect(await redis.get(getQueryKey({ category: "PHONES" }))).not.toBeNull();
  });
  it("invalidates the list cache on create", async () => {
    await listProducts({ category: "PHONES" });
    await createProduct({ ...input, name: "Svc Test Phone 2" } as never);
    expect(await redis.get(getQueryKey({ category: "PHONES" }))).toBeNull();
  });
});
```
Run: `yarn vitest run packages/core/src/services/products/listProducts.test.ts` — Expected: PASS (Mongo + Redis running).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/services/products packages/core/src/services/index.ts
git commit -m "feat(core): products services — cache-aware reads + glob invalidation on write"
```

---

### Task 10: `@mogadget/core` — IAM service + middleware + runtime bootstrap

**Files:**
- Create: `src/services/iam/{resolveEffectivePermissions.ts,index.ts}`, `src/middleware/{withPermission.ts,withAudit.ts,withRateLimit.ts,index.ts}`, `src/runtime/{bootstrap.ts,index.ts}`
- Modify: `src/services/index.ts` (add `iam`), `src/index.ts` (export middleware/models/services/databases/runtime)
- Test: `src/services/iam/resolveEffectivePermissions.test.ts`

**Interfaces:**
- Produces:
  - `resolveEffectivePermissions({ userId, refreshCache? }): Promise<TPermission[]>`, `invalidateEffectivePermissions({ userId })`.
  - `requirePermission(...required): Promise<ISessionPayload>` (throws), `withPermission(handler, ...required)`, `sessionHasPermissions(session, required)`.
  - `auditAdmin(handler, opts)`, `auditUser(handler, opts)`.
  - `withRateLimit(handler, { scope, max?, windowSeconds? })`.
  - `bootstrap(): Promise<void>` (connect Mongo + Redis).

- [ ] **Step 1: Write `services/iam/resolveEffectivePermissions.ts` + barrel**

```ts
import { getUserByIdDB } from "../../models/users";
import { listPoliciesByIdsDB } from "../../models/policies";
import { listGroupsByIdsDB } from "../../models/groups";
import { compileStatements, type IPolicyStatement, type TPermission } from "@mogadget/contracts/iam";
import { redisRetrieveKeyString, redisUpdateKeyString, redisDeleteKeys } from "../../databases/redis";
const TTL = 30;
const key = (userId: string) => `services:iam:resolveEffectivePermissions:${userId}`;
export default async function resolveEffectivePermissions({ userId, refreshCache }: { userId: string; refreshCache?: boolean }): Promise<TPermission[]> {
  if (!refreshCache) { const c = await redisRetrieveKeyString<TPermission[]>(key(userId)); if (c) return c; }
  const user = await getUserByIdDB({ id: userId });
  if (!user) return [];
  const groups = await listGroupsByIdsDB({ ids: user.groupIds.map(String) });
  const groupPolicyIds = groups.flatMap((g) => g.policyIds.map(String));
  const policies = await listPoliciesByIdsDB({ ids: [...user.attachedPolicyIds.map(String), ...groupPolicyIds] });
  const statements: IPolicyStatement[] = [
    ...policies.flatMap((p) => p.statements),
    ...groups.flatMap((g) => g.statements),
  ];
  const perms = compileStatements(statements);
  await redisUpdateKeyString(key(userId), perms, true, TTL);
  return perms;
}
export async function invalidateEffectivePermissions({ userId }: { userId: string }): Promise<void> { await redisDeleteKeys(key(userId)); }
```
`services/iam/index.ts`: `export { default as resolveEffectivePermissions, invalidateEffectivePermissions } from "./resolveEffectivePermissions";`
Then set `services/index.ts` to include `export * as iam from "./iam";`

- [ ] **Step 2: Write `middleware/withPermission.ts`**

```ts
import type { TPermission } from "@mogadget/contracts/iam";
import { getSessionUser } from "../lib/requestContext";
import type { ISessionPayload } from "../lib/session";
import { fail, type IEnvelope } from "../lib/response";
import { ErrUnauthenticated, ErrUnauthorized } from "../constants/errors";
import resolveEffectivePermissions from "../services/iam/resolveEffectivePermissions";
export async function sessionHasPermissions(session: ISessionPayload, required: TPermission[]): Promise<boolean> {
  const perms = new Set(await resolveEffectivePermissions({ userId: session.sub }));
  return required.every((r) => perms.has(r));
}
export async function requirePermission(...required: TPermission[]): Promise<ISessionPayload> {
  const session = getSessionUser();
  if (!session) throw ErrUnauthenticated;
  if (required.length && !(await sessionHasPermissions(session, required))) throw ErrUnauthorized;
  return session;
}
export function withPermission(handler: (req: Request) => Promise<IEnvelope>, ...required: TPermission[]) {
  return async (req: Request): Promise<IEnvelope> => {
    const session = getSessionUser();
    if (!session) return fail(ErrUnauthenticated.code, ErrUnauthenticated.message);
    if (required.length && !(await sessionHasPermissions(session, required))) return fail(ErrUnauthorized.code, ErrUnauthorized.message);
    return handler(req);
  };
}
```

- [ ] **Step 3: Write `middleware/withAudit.ts` and `withRateLimit.ts` + barrel**

`withAudit.ts`:
```ts
import type { THandler } from "../lib/handler";
import { getSessionUser } from "../lib/requestContext";
import { createAuditLogDB } from "../models/adminAuditLogs";
export interface IAuditOptions { action: string; targetType?: string; captureBody?: boolean; }
function wrap(handler: THandler, options: IAuditOptions): THandler {
  return async (req) => {
    const start = process.hrtime.bigint();
    let body: unknown;
    if (options.captureBody) { try { body = await req.clone().json(); } catch { body = undefined; } }
    const res = await handler(req);
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const session = getSessionUser();
    void createAuditLogDB({ userId: session?.sub ?? null, action: options.action, targetType: options.targetType, responseCode: res.status, durationMs, body });
    return res;
  };
}
export const auditAdmin = wrap;
export const auditUser = wrap;
```
`withRateLimit.ts`:
```ts
import type { THandler } from "../lib/handler";
import { clientIp } from "../lib/clientIp";
import { redis, redisIncr } from "../databases/redis";
import { fail } from "../lib/response";
import { ErrRateLimited } from "../constants/errors";
export function withRateLimit(handler: THandler, options: { scope: string; max?: number; windowSeconds?: number }): THandler {
  const max = options.max ?? 30, windowSeconds = options.windowSeconds ?? 60;
  return async (req) => {
    const key = `rl:${options.scope}:${clientIp(req)}`;
    const count = await redisIncr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    if (count > max) { const ttl = await redis.ttl(key); return fail(ErrRateLimited.code, `Too many requests. Try again in ${ttl < 0 ? windowSeconds : ttl}s`); }
    return handler(req);
  };
}
```
`middleware/index.ts`: `export * from "./withPermission"; export * from "./withAudit"; export * from "./withRateLimit";`

- [ ] **Step 4: Write `runtime/bootstrap.ts` + barrel, then set `src/index.ts`**

`runtime/bootstrap.ts`:
```ts
import { connectMongoDB } from "../databases/mongoDB";
import { connectRedis } from "../databases/redis";
import { getLogger } from "../lib/logger";
export async function bootstrap(): Promise<void> {
  await connectMongoDB();
  await connectRedis();
  getLogger().info("mogadget core bootstrapped (mongo + redis)");
}
```
`runtime/index.ts`: `export * from "./bootstrap";`
`src/index.ts`:
```ts
export * from "./constants";
export * from "./domain";
export * from "./lib";
export * from "./middleware";
export * as models from "./models";
export * as services from "./services";
export * from "./databases";
export * from "./metrics";
export * from "./runtime";
```

- [ ] **Step 5: Write the IAM service test (failing → pass)**

`src/services/iam/resolveEffectivePermissions.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../../databases/mongoDB";
import { connectRedis, redis } from "../../databases/redis";
import { upsertPolicyByNameDB, Policy } from "../../models/policies";
import { upsertGroupByNameDB, Group } from "../../models/groups";
import { upsertUserByUsernameDB, User } from "../../models/users";
import resolveEffectivePermissions from "./resolveEffectivePermissions";

describe("resolveEffectivePermissions", () => {
  beforeAll(async () => { await connectMongoDB(); await connectRedis(); });
  afterAll(async () => { await Promise.all([Policy.deleteMany({ name: /RTest/ }), Group.deleteMany({ name: /RTest/ }), User.deleteMany({ username: /rtest/ })]); await redis.flushdb(); await redis.quit(); await disconnectMongoDB(); });
  it("compiles admin '*' into every permission via a group", async () => {
    const pol = await upsertPolicyByNameDB({ name: "RTestAdmin", managed: true, statements: [{ effect: "Allow", actions: ["*"] }] });
    const grp = await upsertGroupByNameDB({ name: "RTestAdmins", managed: true, policyIds: [String(pol?._id)] });
    const usr = await upsertUserByUsernameDB({ username: "rtest-owner", passwordHash: "x", groupIds: [String(grp?._id)] });
    const perms = await resolveEffectivePermissions({ userId: String(usr?._id), refreshCache: true });
    expect(perms).toContain("products:write");
    expect(perms).toContain("iam:manage");
  });
});
```
Run: `yarn vitest run packages/core/src/services/iam` — Expected: PASS. Then `yarn workspace @mogadget/core ts.check` — Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/services/iam packages/core/src/middleware packages/core/src/runtime packages/core/src/index.ts packages/core/src/services/index.ts
git commit -m "feat(core): IAM permission resolution, withPermission/withAudit/withRateLimit, bootstrap"
```

---

### Task 11: `@mogadget/api` — Hono host, adapter, product + auth routes, manifest

**Files:**
- Create: `services/api/package.json`, `tsconfig.json`, `src/index.ts`, `src/app.ts`, `src/lib/adapter.ts`, `src/routes/manifest.ts`, `src/routes/auth.ts`, `src/routes/products/{route.ts,facets/route.ts,[slug]/route.ts,[slug]/click/route.ts,parseSearchParams.ts,dto.ts}`, `src/routes/admin/products/{route.ts,[id]/route.ts,[id]/status/route.ts,[id]/visibility/route.ts,[id]/images/route.ts}`
- Test: `services/api/src/routes/products/dto.test.ts`

**Interfaces:**
- Consumes: `@mogadget/core` (`withApiHandler`, `services.products`, `requirePermission`, `auditAdmin`, `validateBody`, `ok/created/fail`, session, requestContext, bootstrap), `@mogadget/contracts` (schemas).
- Produces: a Hono `app` (fetch handler) mounting every route from `manifest`; `toPublicProduct(p): IProductDto`.

- [ ] **Step 1: Create `services/api/package.json` + `tsconfig.json`**

```json
{
  "name": "@mogadget/api",
  "private": true, "version": "0.1.0", "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts", "start": "tsx src/index.ts",
    "ts.check": "tsc --noEmit", "test": "vitest run", "seed": "tsx src/scripts/seed.ts"
  },
  "dependencies": {
    "@mogadget/core": "*", "@mogadget/contracts": "*",
    "hono": "^4.6.0", "@hono/node-server": "^1.13.0"
  },
  "devDependencies": { "tsx": "^4.19.0" }
}
```
`tsconfig.json`: `{ "extends": "../../tsconfig.base.json", "include": ["src"] }`

- [ ] **Step 2: Write `src/routes/products/dto.ts` + failing test**

`dto.ts`:
```ts
import type { IProduct } from "@mogadget/core";
import type { IProductDto } from "@mogadget/contracts/types";
// NOTE: image `key` → public `url`. Until object storage is wired (M2), url = key passthrough.
export function toPublicProduct(p: IProduct): IProductDto {
  return {
    id: String(p._id), slug: p.slug, name: p.name, category: p.category, brand: p.brand,
    condition: p.condition, cosmeticGrade: p.cosmeticGrade, priceNaira: p.priceNaira,
    description: p.description, stockType: p.stockType, status: p.status, quantity: p.quantity,
    images: [...p.images].sort((a, b) => a.sortOrder - b.sortOrder).map((i) => ({ url: i.key, sortOrder: i.sortOrder })),
    specs: p.specs, whatsappClickCount: p.whatsappClickCount, instagramClickCount: p.instagramClickCount,
    createdAt: new Date(p.createdAt).toISOString(), updatedAt: new Date(p.updatedAt).toISOString(),
  };
}
```
`dto.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { toPublicProduct } from "./dto";
describe("toPublicProduct", () => {
  it("sorts images by sortOrder and stringifies dates", () => {
    const now = new Date();
    const dto = toPublicProduct({ _id: "abc", slug: "s", name: "n", category: "PHONES", brand: "iPhone",
      condition: "UK_USED", cosmeticGrade: "A", priceNaira: 1, description: null, stockType: "UNIQUE_UNIT",
      status: "AVAILABLE", quantity: null, isVisible: true, specs: [],
      images: [{ key: "b", sortOrder: 1 }, { key: "a", sortOrder: 0 }],
      whatsappClickCount: 0, instagramClickCount: 0, createdAt: now, updatedAt: now } as never);
    expect(dto.images[0].url).toBe("a");
    expect(typeof dto.createdAt).toBe("string");
  });
});
```
Run: `yarn vitest run services/api/src/routes/products/dto.test.ts` — Expected: FAIL then PASS after `dto.ts` exists.

- [ ] **Step 3: Write `parseSearchParams.ts` and the public product routes**

`parseSearchParams.ts`:
```ts
import { productFilterSchema, type TProductFilter } from "@mogadget/contracts/schemas";
export function parseProductFilter(url: URL): TProductFilter {
  const p = url.searchParams;
  return productFilterSchema.parse({
    category: p.get("category") ?? undefined,
    q: p.get("q") ?? undefined,
    condition: p.getAll("condition").length ? p.getAll("condition") : undefined,
    brand: p.getAll("brand").length ? p.getAll("brand") : undefined,
    min: p.get("min") ?? undefined, max: p.get("max") ?? undefined,
    sort: p.get("sort") ?? undefined,
  });
}
```
`products/route.ts`:
```ts
import { withApiHandler, ok, services } from "@mogadget/core";
import { parseProductFilter } from "./parseSearchParams";
import { toPublicProduct } from "./dto";
export const GET = withApiHandler({ route: "/api/products" }, async (req) => {
  const filter = parseProductFilter(new URL(req.url));
  const rows = await services.products.listProducts(filter);
  return ok(rows.map(toPublicProduct));
});
```
`products/facets/route.ts`:
```ts
import { withApiHandler, ok, services } from "@mogadget/core";
export const GET = withApiHandler({ route: "/api/products/facets" }, async () => ok(await services.products.productFacets()));
```
`products/[slug]/route.ts`:
```ts
import { withApiHandler, ok, services, ErrNotFound } from "@mogadget/core";
import { toPublicProduct } from "../dto";
interface ICtx { params: Promise<{ slug: string }>; }
export const GET = withApiHandler<ICtx>({ route: "/api/products/[slug]" }, async (_req, ctx) => {
  const { slug } = await ctx.params;
  const product = await services.products.getProductBySlug({ slug });
  if (!product) throw ErrNotFound;
  return ok(toPublicProduct(product));
});
```
`products/[slug]/click/route.ts`:
```ts
import { withApiHandler, ok, services, validateBody, withRateLimit } from "@mogadget/core";
import { clickSchema } from "@mogadget/contracts/schemas";
interface ICtx { params: Promise<{ slug: string }>; }
export const POST = withApiHandler<ICtx>({ route: "/api/products/[slug]/click" }, async (req, ctx) => {
  const { slug } = await ctx.params;
  return withRateLimit(async (r) => {
    const { channel } = await validateBody(r, clickSchema);
    await services.products.incrementClick({ slug, channel });
    return ok({ ok: true });
  }, { scope: "click", max: 20, windowSeconds: 60 })(req);
});
```

- [ ] **Step 4: Write the admin product routes**

`admin/products/route.ts`:
```ts
import { withApiHandler, ok, created, services, requirePermission, auditAdmin, validateBody } from "@mogadget/core";
import { Permission } from "@mogadget/contracts/iam";
import { createProductSchema } from "@mogadget/contracts/schemas";
import { toPublicProduct } from "../../products/dto";
export const GET = withApiHandler({ route: "/api/admin/products" }, async () => {
  await requirePermission(Permission.ProductsWrite);
  const rows = await services.products.listProducts({ status: "all", includeHidden: true });
  return ok(rows.map(toPublicProduct));
});
export const POST = withApiHandler({ route: "/api/admin/products" }, (req) =>
  auditAdmin(async (r) => {
    await requirePermission(Permission.ProductsWrite);
    const input = await validateBody(r, createProductSchema);
    const doc = await services.products.createProduct(input);
    if (!doc) throw new Error("create failed");
    return created(toPublicProduct(doc));
  }, { action: "product.create", targetType: "product", captureBody: true })(req));
```
`admin/products/[id]/route.ts`:
```ts
import { withApiHandler, ok, services, requirePermission, auditAdmin, validateBody, ErrNotFound } from "@mogadget/core";
import { Permission } from "@mogadget/contracts/iam";
import { updateProductSchema } from "@mogadget/contracts/schemas";
import { getProductByIdDB } from "@mogadget/core";
import { toPublicProduct } from "../../../products/dto";
interface ICtx { params: Promise<{ id: string }>; }
export const GET = withApiHandler<ICtx>({ route: "/api/admin/products/[id]" }, async (_req, ctx) => {
  await requirePermission(Permission.ProductsWrite);
  const doc = await getProductByIdDB({ id: (await ctx.params).id });
  if (!doc) throw ErrNotFound;
  return ok(toPublicProduct(doc));
});
export const PATCH = withApiHandler<ICtx>({ route: "/api/admin/products/[id]" }, async (req, ctx) => {
  const { id } = await ctx.params;
  return auditAdmin(async (r) => {
    await requirePermission(Permission.ProductsWrite);
    const patch = await validateBody(r, updateProductSchema, { patch: true });
    const doc = await services.products.updateProduct({ id, patch });
    if (!doc) throw ErrNotFound;
    return ok(toPublicProduct(doc));
  }, { action: "product.update", targetType: "product", captureBody: true })(req);
});
export const DELETE = withApiHandler<ICtx>({ route: "/api/admin/products/[id]" }, async (req, ctx) => {
  const { id } = await ctx.params;
  return auditAdmin(async () => {
    await requirePermission(Permission.ProductsWrite);
    const okDel = await services.products.deleteProduct({ id });
    if (!okDel) throw ErrNotFound;
    return ok({ deleted: true });
  }, { action: "product.delete", targetType: "product" })(req);
});
```
`admin/products/[id]/status/route.ts`, `visibility/route.ts`, `images/route.ts`:
```ts
// status/route.ts
import { withApiHandler, ok, services, requirePermission, auditAdmin, validateBody, ErrNotFound } from "@mogadget/core";
import { Permission } from "@mogadget/contracts/iam";
import { statusSchema } from "@mogadget/contracts/schemas";
import { z } from "zod";
import { toPublicProduct } from "../../../../products/dto";
interface ICtx { params: Promise<{ id: string }>; }
export const POST = withApiHandler<ICtx>({ route: "/api/admin/products/[id]/status" }, async (req, ctx) => {
  const { id } = await ctx.params;
  return auditAdmin(async (r) => {
    await requirePermission(Permission.ProductsWrite);
    const { status } = await validateBody(r, z.object({ status: statusSchema }));
    const doc = await services.products.setStatus({ id, status });
    if (!doc) throw ErrNotFound;
    return ok(toPublicProduct(doc));
  }, { action: "product.setStatus", targetType: "product", captureBody: true })(req);
});
```
```ts
// visibility/route.ts
import { withApiHandler, ok, services, requirePermission, auditAdmin, validateBody, ErrNotFound } from "@mogadget/core";
import { Permission } from "@mogadget/contracts/iam";
import { z } from "zod";
import { toPublicProduct } from "../../../../products/dto";
interface ICtx { params: Promise<{ id: string }>; }
export const POST = withApiHandler<ICtx>({ route: "/api/admin/products/[id]/visibility" }, async (req, ctx) => {
  const { id } = await ctx.params;
  return auditAdmin(async (r) => {
    await requirePermission(Permission.ProductsWrite);
    const { isVisible } = await validateBody(r, z.object({ isVisible: z.boolean() }));
    const doc = await services.products.setVisibility({ id, isVisible });
    if (!doc) throw ErrNotFound;
    return ok(toPublicProduct(doc));
  }, { action: "product.setVisibility", targetType: "product", captureBody: true })(req);
});
```
```ts
// images/route.ts — M1 accepts a list of {key,sortOrder}; signed-URL upload lands in M2.
import { withApiHandler, ok, services, requirePermission, auditAdmin, validateBody, ErrNotFound } from "@mogadget/core";
import { Permission } from "@mogadget/contracts/iam";
import { z } from "zod";
import { toPublicProduct } from "../../../../products/dto";
interface ICtx { params: Promise<{ id: string }>; }
const bodySchema = z.object({ images: z.array(z.object({ key: z.string().min(1), sortOrder: z.number().int().nonnegative() })) });
export const POST = withApiHandler<ICtx>({ route: "/api/admin/products/[id]/images" }, async (req, ctx) => {
  const { id } = await ctx.params;
  return auditAdmin(async (r) => {
    await requirePermission(Permission.ProductsWrite);
    const { images } = await validateBody(r, bodySchema);
    const doc = await services.products.updateProduct({ id, patch: { images } });
    if (!doc) throw ErrNotFound;
    return ok(toPublicProduct(doc));
  }, { action: "product.setImages", targetType: "product", captureBody: true })(req);
});
```

- [ ] **Step 5: Write `src/routes/auth.ts`**

```ts
import { withApiHandler, ok, fail, validateBody, withRateLimit, signSession, verifyPassword, issueSessionCookie, revokeSessionCookie, ErrUnauthenticated } from "@mogadget/core";
import { getUserByUsernameDB } from "@mogadget/core";
import { adminLoginSchema } from "@mogadget/contracts/schemas";
export const LOGIN = withApiHandler({ route: "/api/admin/login" }, (req) =>
  withRateLimit(async (r) => {
    const { username, password } = await validateBody(r, adminLoginSchema);
    const user = await getUserByUsernameDB({ username });
    if (!user || !(await verifyPassword(user.passwordHash, password))) return fail(ErrUnauthenticated.code, "Invalid credentials");
    const token = await signSession({ sub: String(user._id), username: user.username });
    issueSessionCookie("mg_session", token, 60 * 60 * 24 * 7);
    return ok({ username: user.username });
  }, { scope: "login", max: 5, windowSeconds: 15 * 60 })(req));
export const LOGOUT = withApiHandler({ route: "/api/admin/logout" }, async () => { revokeSessionCookie("mg_session"); return ok({ ok: true }); });
```
> `getUserByUsernameDB` must be re-exported from `@mogadget/core` root — confirm `src/index.ts` `export * as models` also surfaces named `*DB` fns. To keep imports flat, add to core `src/index.ts`: `export { getUserByUsernameDB, getProductByIdDB } from "./models/users"` is wrong path — instead import via `models.users.getUserByUsernameDB`. **Correction:** in `auth.ts` import `{ models }` and call `models.users.getUserByUsernameDB`. Apply the same `models.products.getProductByIdDB` fix in `admin/products/[id]/route.ts`.

- [ ] **Step 6: Write `src/lib/adapter.ts`, `src/routes/manifest.ts`, `src/app.ts`, `src/index.ts`**

`lib/adapter.ts`:
```ts
import type { Context } from "hono";
import { runWithRequestContext, verifySession, getQueuedCookies, type IEnvelope, type TBaseHandler } from "@mogadget/core";
function readToken(c: Context): string | null {
  const auth = c.req.header("authorization"); if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookie = c.req.header("cookie") ?? ""; const m = cookie.match(/(?:^|;\s*)mg_session=([^;]+)/); return m ? decodeURIComponent(m[1]!) : null;
}
export async function runRoute(c: Context, handler: TBaseHandler<{ params: Promise<Record<string,string>> }>): Promise<Response> {
  const token = readToken(c);
  const session = token ? await verifySession(token) : null;
  const ctx = { session, requestId: crypto.randomUUID(), cookies: [] as { name: string; value: string; maxAge: number }[] };
  const envelope: IEnvelope = await runWithRequestContext(ctx, () =>
    handler(c.req.raw, { params: Promise.resolve(c.req.param() as Record<string,string>) }));
  const headers = new Headers({ "content-type": "application/json", ...(envelope.headers ?? {}) });
  for (const ck of getQueuedCookies()) headers.append("set-cookie", `${ck.name}=${encodeURIComponent(ck.value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ck.maxAge}`);
  return new Response(JSON.stringify(envelope.body), { status: envelope.status, headers });
}
```
`routes/manifest.ts`:
```ts
import type { TBaseHandler } from "@mogadget/core";
import * as products from "./products/route";
import * as facets from "./products/facets/route";
import * as productBySlug from "./products/[slug]/route";
import * as click from "./products/[slug]/click/route";
import * as adminProducts from "./admin/products/route";
import * as adminProductById from "./admin/products/[id]/route";
import * as adminStatus from "./admin/products/[id]/status/route";
import * as adminVisibility from "./admin/products/[id]/visibility/route";
import * as adminImages from "./admin/products/[id]/images/route";
import { LOGIN, LOGOUT } from "./auth";
export interface IRouteEntry { method: "GET"|"POST"|"PATCH"|"DELETE"; path: string; handler: TBaseHandler<{ params: Promise<Record<string,string>> }>; }
export const manifest: IRouteEntry[] = [
  { method: "GET", path: "/api/products", handler: products.GET as never },
  { method: "GET", path: "/api/products/facets", handler: facets.GET as never },
  { method: "GET", path: "/api/products/:slug", handler: productBySlug.GET as never },
  { method: "POST", path: "/api/products/:slug/click", handler: click.POST as never },
  { method: "POST", path: "/api/admin/login", handler: LOGIN as never },
  { method: "POST", path: "/api/admin/logout", handler: LOGOUT as never },
  { method: "GET", path: "/api/admin/products", handler: adminProducts.GET as never },
  { method: "POST", path: "/api/admin/products", handler: adminProducts.POST as never },
  { method: "GET", path: "/api/admin/products/:id", handler: adminProductById.GET as never },
  { method: "PATCH", path: "/api/admin/products/:id", handler: adminProductById.PATCH as never },
  { method: "DELETE", path: "/api/admin/products/:id", handler: adminProductById.DELETE as never },
  { method: "POST", path: "/api/admin/products/:id/status", handler: adminStatus.POST as never },
  { method: "POST", path: "/api/admin/products/:id/visibility", handler: adminVisibility.POST as never },
  { method: "POST", path: "/api/admin/products/:id/images", handler: adminImages.POST as never },
];
```
`app.ts`:
```ts
import { Hono } from "hono";
import { runRoute } from "./lib/adapter";
import { manifest } from "./routes/manifest";
export function createApp(): Hono {
  const app = new Hono();
  app.get("/health", (c) => c.json({ code: 200, message: "OK", data: { up: true } }));
  for (const r of manifest) {
    const bind = (c: Parameters<typeof runRoute>[0]) => runRoute(c, r.handler);
    if (r.method === "GET") app.get(r.path, bind);
    else if (r.method === "POST") app.post(r.path, bind);
    else if (r.method === "PATCH") app.patch(r.path, bind);
    else app.delete(r.path, bind);
  }
  return app;
}
```
`index.ts`:
```ts
import { serve } from "@hono/node-server";
import { bootstrap } from "@mogadget/core";
import { createApp } from "./app";
const port = Number(process.env.PORT ?? 4000);
await bootstrap();
serve({ fetch: createApp().fetch, port });
console.log(`@mogadget/api on :${port}`);
```

- [ ] **Step 7: Apply the `models.*` import corrections, run ts.check + dto test**

Fix `auth.ts` and `admin/products/[id]/route.ts` to use `models.users.getUserByUsernameDB` / `models.products.getProductByIdDB` (import `{ models }` from `@mogadget/core`).
Run: `yarn workspace @mogadget/api ts.check && yarn vitest run services/api/src/routes/products/dto.test.ts`
Expected: no TS errors; dto test PASS.

- [ ] **Step 8: Smoke-test the running API**

Start Mongo + Redis, then:
Run: `yarn workspace @mogadget/api dev` (in one shell) and in another:
`curl -s localhost:4000/health` → `{"code":200,...}`; `curl -s localhost:4000/api/products` → `{"code":200,"message":"OK","data":[]}`.
Stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add services/api
git commit -m "feat(api): Hono host, ALS adapter, product + admin + auth routes, manifest"
```

---

### Task 12: `@mogadget/api` — seed script (owner + built-ins + demo products)

**Files:**
- Create: `services/api/src/scripts/seed.ts`

**Interfaces:**
- Consumes: core `bootstrap`, `models`, `hashPassword`, contracts `iam.BUILTIN_POLICIES/BUILTIN_GROUPS`, `generateSlug`.
- Produces: a runnable `yarn seed` that prints the owner credentials.

- [ ] **Step 1: Write `src/scripts/seed.ts`**

```ts
import { bootstrap, models, hashPassword, generateSlug, disconnectMongoDB } from "@mogadget/core";
import { iam } from "@mogadget/contracts";

const OWNER_USERNAME = process.env.SEED_OWNER_USERNAME ?? "owner";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "password";

const DEMO = [
  { name: "iPhone 13 128GB Midnight", category: "PHONES", brand: "iPhone", condition: "UK_USED", cosmeticGrade: "A", priceNaira: 485000, stockType: "UNIQUE_UNIT", status: "AVAILABLE", quantity: null, specs: [{ label: "Battery health", value: "89%" }, { label: "Screen", value: "Original, no scratches" }] },
  { name: "iPhone 15 Pro Max 256GB", category: "PHONES", brand: "iPhone", condition: "NEW", cosmeticGrade: null, priceNaira: 1850000, stockType: "RESTOCKABLE", status: "IN_STOCK", quantity: 4, specs: [] },
  { name: "PlayStation 5 Slim (Disc)", category: "CONSOLES", brand: "PlayStation", condition: "NEW", cosmeticGrade: null, priceNaira: 985000, stockType: "RESTOCKABLE", status: "IN_STOCK", quantity: 6, specs: [] },
  { name: "MacBook Air M2 13\" 8/256GB", category: "LAPTOPS", brand: "MacBook", condition: "US_USED", cosmeticGrade: "B", priceNaira: 1150000, stockType: "UNIQUE_UNIT", status: "AVAILABLE", quantity: null, specs: [] },
  { name: "iPhone 12 64GB White", category: "PHONES", brand: "iPhone", condition: "NG_USED", cosmeticGrade: "B", priceNaira: 320000, stockType: "UNIQUE_UNIT", status: "SOLD", quantity: null, specs: [] },
] as const;

async function main() {
  await bootstrap();
  // 1) IAM built-ins
  const policyIdByName: Record<string, string> = {};
  for (const p of iam.BUILTIN_POLICIES) {
    const doc = await models.policies.upsertPolicyByNameDB({ name: p.name, managed: p.managed, statements: [...p.statements] });
    if (doc) policyIdByName[p.name] = String(doc._id);
  }
  const groupIdByName: Record<string, string> = {};
  for (const g of iam.BUILTIN_GROUPS) {
    const doc = await models.groups.upsertGroupByNameDB({ name: g.name, managed: g.managed, policyIds: g.policyNames.map((n) => policyIdByName[n]!).filter(Boolean) });
    if (doc) groupIdByName[g.name] = String(doc._id);
  }
  // 2) Owner in Administrators
  await models.users.upsertUserByUsernameDB({ username: OWNER_USERNAME, passwordHash: await hashPassword(OWNER_PASSWORD), groupIds: [groupIdByName.Administrators!] });
  // 3) Demo products (idempotent by name)
  for (const d of DEMO) {
    const exists = await models.products.listProductsDB({ status: "all", includeHidden: true });
    if (exists.some((x) => x.name === d.name)) continue;
    await models.products.createProductDB({ ...d, slug: generateSlug(d.name), cosmeticGrade: d.cosmeticGrade ?? null, description: null, quantity: d.quantity ?? null, images: [], specs: [...d.specs] } as never);
  }
  console.log(`\nSeed complete. Owner login → username: ${OWNER_USERNAME} · password: ${OWNER_PASSWORD}\n`);
  await disconnectMongoDB();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the seed against a live Mongo + Redis**

Run: `yarn seed`
Expected: prints "Seed complete. Owner login → username: owner · password: password". Verify: `curl -s localhost:4000/api/products | jq '.data | length'` (with API running) ≥ 4 (the SOLD item is visible too).

- [ ] **Step 3: Verify login works end-to-end**

Run (API running): `curl -s -i -X POST localhost:4000/api/admin/login -H 'content-type: application/json' -d '{"username":"owner","password":"password"}'`
Expected: `200`, a `set-cookie: mg_session=...` header, body `{"code":200,...,"data":{"username":"owner"}}`. A wrong password returns `401`.

- [ ] **Step 4: Commit**

```bash
git add services/api/src/scripts/seed.ts
git commit -m "feat(api): seed — owner in Administrators, IAM built-ins, demo catalog"
```

---

### Task 13: `@mogadget/web` — Next.js scaffold, design tokens, fetcher, proving home shell

**Files:**
- Create: `apps/web/package.json`, `tsconfig.json`, `next.config.mjs`, `src/styles/global.ts`, `src/styles/colors.ts`, `src/constants/fetcher.ts`, `src/helpers/format.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Test: `apps/web/src/helpers/format.test.ts`

**Interfaces:**
- Consumes: `@mogadget/contracts` (types), the running API (`/api/products`).
- Produces: a Next dev server rendering a home shell that fetches the seeded catalog; `formatNaira` (web copy), `COLORS` tokens.

- [ ] **Step 1: Create `apps/web/package.json`, `tsconfig.json`, `next.config.mjs`**

```json
{
  "name": "@mogadget/web",
  "private": true, "version": "0.1.0", "type": "module",
  "scripts": { "dev": "next dev -p 3000", "build": "next build", "start": "next start -p 3000", "ts.check": "tsc --noEmit" },
  "dependencies": {
    "@mogadget/contracts": "*", "next": "^15.1.0", "react": "^19.0.0", "react-dom": "^19.0.0",
    "swr": "^2.2.5", "axios": "^1.7.0"
  },
  "devDependencies": { "@types/react": "^19.0.0", "@types/react-dom": "^19.0.0" }
}
```
`tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "preserve", "lib": ["ES2022","DOM","DOM.Iterable"], "plugins": [{ "name": "next" }], "moduleResolution": "Bundler" },
  "include": ["src", "next-env.d.ts", ".next/types/**/*.ts"] }
```
`next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
export default { transpilePackages: ["@mogadget/contracts"], async rewrites() {
  return [{ source: "/api/:path*", destination: `${process.env.API_ORIGIN ?? "http://localhost:4000"}/api/:path*` }];
} };
```

- [ ] **Step 2: Write `src/styles/colors.ts` and `src/app/globals.css`**

`colors.ts`:
```ts
export const COLORS = {
  ink: "#141518", paper: "#FAFAF7", brand: "#0B7A3E", brandHover: "#08602F",
  whatsapp: "#25D366", amber: "#D98E04", amberText: "#A16A03", sold: "#8A8F98", danger: "#C4372F",
} as const;
```
`globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Instrument+Sans:wght@400;500;600&display=swap');
:root {
  --ink:#141518; --paper:#FAFAF7; --brand:#0B7A3E; --brand-hover:#08602F;
  --whatsapp:#25D366; --amber:#D98E04; --amber-text:#A16A03; --sold:#8A8F98; --danger:#C4372F;
  --font-display:'Space Grotesk',system-ui,sans-serif; --font-body:'Instrument Sans',system-ui,sans-serif;
}
* { box-sizing:border-box; }
body { margin:0; background:var(--paper); color:var(--ink); font-family:var(--font-body); }
.price { font-family:var(--font-display); font-variant-numeric:tabular-nums; }
```
`src/styles/global.ts`: `export const FONTS = { display: "'Space Grotesk'", body: "'Instrument Sans'" } as const;`

- [ ] **Step 3: Write `src/helpers/format.ts` + failing test**

`format.ts`:
```ts
export function formatNaira(n: number): string { return `₦${Math.trunc(n).toLocaleString("en-US")}`; }
```
`format.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatNaira } from "./format";
describe("web formatNaira", () => { it("matches the ₦450,000 style", () => { expect(formatNaira(450000)).toBe("₦450,000"); }); });
```
Run: `yarn vitest run apps/web/src/helpers/format.test.ts` — Expected: PASS. (Add `apps/*` to `vitest.workspace.ts` if the web tests are not picked up.)

- [ ] **Step 4: Write `src/constants/fetcher.ts`, `src/app/layout.tsx`, `src/app/page.tsx`**

`fetcher.ts`:
```ts
import axios from "axios";
export const api = axios.create({ baseURL: "/api", withCredentials: true });
export const fetcher = <T>(url: string): Promise<T> => api.get(url).then((r) => r.data.data as T);
```
`layout.tsx`:
```tsx
import "../app/globals.css";
export const metadata = { title: "MoGadget — New & UK-used gadgets", description: "Graded, tested gadgets. Browse, then chat to order." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
```
`page.tsx` (server component — fetches the seeded catalog directly to prove wiring):
```tsx
import type { IProductDto } from "@mogadget/contracts/types";
import { formatNaira } from "../helpers/format";
async function getProducts(): Promise<IProductDto[]> {
  const origin = process.env.API_ORIGIN ?? "http://localhost:4000";
  const res = await fetch(`${origin}/api/products`, { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()).data as IProductDto[];
}
export default async function Home() {
  const products = await getProducts();
  return (
    <main style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ background: "var(--brand)", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 12 }}>
        1-Month Warranty on Everything · Free Delivery in Lagos · Nationwide
      </div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, letterSpacing: "-.015em" }}>
        Mo<span style={{ color: "var(--brand)" }}>Gadget</span>
      </h1>
      <p style={{ color: "rgba(20,21,24,.65)" }}>New &amp; UK-used gadgets. Real photos, firm prices.</p>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16, marginTop: 24 }}>
        {products.map((p) => (
          <article key={p.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ aspectRatio: "4/3", borderRadius: 10, background: "#eee" }} />
            <div style={{ fontSize: 13 }}>{p.name}</div>
            <div className="price" style={{ fontWeight: 700 }}>{formatNaira(p.priceNaira)}</div>
          </article>
        ))}
      </section>
      {products.length === 0 && <p style={{ color: "var(--sold)" }}>No products yet — run <code>yarn seed</code>.</p>}
    </main>
  );
}
```

- [ ] **Step 5: Run the web app and verify it renders the seeded catalog**

Start Mongo + Redis + API + seed, then: `yarn workspace @mogadget/web dev`.
Open `http://localhost:3000`. Expected: the MoGadget wordmark, trust strip, and a grid of the seeded products with ₦ prices. Stop the dev server.

- [ ] **Step 6: Full-repo verification**

Run: `yarn ts.check` (all workspaces) — Expected: no errors.
Run: `yarn test` (all Vitest projects, Mongo + Redis up) — Expected: all suites PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web vitest.workspace.ts
git commit -m "feat(web): Next scaffold, design tokens, fetcher, catalog-wired home shell"
```

---

## Self-Review

**Spec coverage:**
- §3 monorepo + naming → Task 1, and each package's `package.json` (Tasks 2,4,11,13). ✓
- §4 data model + invariants → contracts enums/schemas (Task 2), domain invariants (Task 4), products model (Task 7). ✓
- §5 DOE triad → models (Tasks 7–8), services (Tasks 9–10), routes (Task 11). ✓
- §6 IAM catalog → Task 3; §5.2 IAM models/service → Tasks 8, 10. ✓
- §7 caching/invalidation → redis helpers (Task 5), service cache + invalidation (Task 9), IAM cache (Task 10). ✓
- §8 API surface → Task 11 (all listed routes) + auth + click; seed/login verification (Task 12). ✓
- §9 design tokens + web wiring → Task 13 (M1 subset: tokens, fetcher, home shell; full screens are M2/M3, called out). ✓
- §11 testing (TDD domain, integration) → Tasks 4,5,7,9,10 tests. ✓
- Object-storage open item (§12.4) → `dto.ts` notes key→url passthrough until M2; images route accepts keys. ✓

**Placeholder scan:** No "TBD/TODO/implement later". Two forward-references are explicit and safe: (a) `iam` barrel export wired in Task 3/10 with exact instructions; (b) images signed-URL upload deferred to M2 with a working key-list interim. The `updateProductSchema.omit({})` empty-omit is intentional (slug is not in `createProductSchema`, so nothing to omit) — left as `.partial()` effectively.

**Type consistency:** `getQueryKey` names align across `getProductBySlug`/`listProducts`/`invalidateCacheKeys`; `IProduct` shape is identical in model, dto, and tests; `IEnvelope`/`IResponseData` envelope consistent core↔contracts; `requirePermission`/`Permission.ProductsWrite` consistent contracts↔core↔routes; `models.*` namespace access corrected in Task 11 Step 7. Fix applied inline: `updateProductSchema` should be `createProductSchema.partial()` (drop the no-op `.omit`).

> **Inline correction to Task 2 Step 5:** change `export const updateProductSchema = createProductSchema.partial().omit({ ... });` to simply `export const updateProductSchema = createProductSchema.partial();`.
