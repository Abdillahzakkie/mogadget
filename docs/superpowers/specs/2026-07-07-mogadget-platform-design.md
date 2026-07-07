# MoGadget Platform — Design Spec

**Version:** 1.0 · **Date:** 2026-07-07 · **Status:** Approved design, ready for planning
**Sources of truth:** `MOGADGET.md` (owner-confirmed context), `mogadget-product-document.md` (product doc),
the Claude Design project *MoGadget Screens* (`0797745d-7d99-4e44-b628-d948a73e556c`), and the Adverta
monorepo conventions (`../adverta`, "Golden Bite" architecture).

This spec **re-aligns** the product document's provisional §7–13 (which proposed Next.js + Supabase/Postgres)
onto the **Adverta system**. Where this spec and the product document disagree on implementation, this spec wins;
where they disagree on *product requirements*, the product document / `MOGADGET.md` win.

---

## 1. Confirmed decisions

1. **"DOE" = the Model→Service→Route triad** — Adverta's signature per-entity layering: `models/<entity>`
   (Mongoose schema + `*DB` operation fns) → `services/<entity>` (Redis cache-aware reads + glob invalidation)
   → `routes` (`withApiHandler` endpoints). Data → Operations → Endpoints.
2. **Full Adverta stack** — MongoDB (Mongoose) + Redis + Turborepo monorepo. Overrides the doc's Supabase/Postgres.
3. **Port IAM, seed one superadmin** — real IAM primitives (users/groups/policies + `withPermission`), with the
   single owner seeded into a built-in `Administrators` group.
4. **Foundation milestone first** — build M1 (scaffold + core + contracts + product/IAM models & services + seed +
   design tokens), review, then M2 (admin), M3 (public), M4 (polish).
5. **Typeface:** the design file uses **Instrument Sans** (body) + **Space Grotesk** (display); this supersedes the
   product doc §11.3 "Inter". Confirmed by owner.

## 2. What MoGadget is (unchanged from `MOGADGET.md`)

A single-owner gadget catalog for a Lagos retailer selling **new and pre-owned** electronics with nationwide
delivery. **Not** a marketplace, **no** cart/checkout/payment/customer-accounts. The site presents products with
trust signals (real photos, firm ₦ price, condition + cosmetic grade, 1-month warranty) and converts interest into a
**WhatsApp / Instagram** chat where the owner closes the sale. Two surfaces: **public catalog** and a single-login
**`/admin`** panel. All out-of-scope items in product doc §2.2 remain out of scope.

## 3. Architecture & monorepo

Turborepo, yarn-1 workspaces, Biome, TS project references, packages consumed **raw from `./src`** (no lib build
step), subpath `exports` maps, all packages `private`, `type: module`, `main/types → ./src/index.ts`. Internal deps
use `"*"`. Scope = `@mogadget/*`.

```
apps/web            @mogadget/web         Next.js App Router — public catalog + /admin
services/api        @mogadget/api         Hono host: routes + adapter + manifest + seed
packages/contracts  @mogadget/contracts   zod schemas + T* types + I*Dto + IAM catalog + envelope + constants
packages/core       @mogadget/core        models/ services/ lib/ middleware/ databases/ metrics/ runtime/ constants/
packages/api-client @mogadget/api-client  typed transport client (mirrors Adverta ApiClient)
```

`apps/mobile` is **out of scope**. Root config (`turbo.json`, `tsconfig.base.json`, `biome.json`) mirrors Adverta.

Backend is **MongoDB + Redis**. The Postgres `CHECK` constraints from product doc §8 become a **domain invariant
function** (`assertProductInvariants`) enforced in the Mongoose model *and* re-checked by zod at the route boundary
(the client is convenience; the server is the authority; the domain fn is the single source).

## 4. Data model

### 4.1 Entities (`packages/core/src/models/<entity>/{index.ts,types.ts}`)

| Entity | Notes |
|---|---|
| `products` | The catalog listing. Embeds `images: [{ key, sortOrder }]` and `specs: [{ label, value }]` (product-page spec grid — battery health, screen, body, in-the-box; design screen 1c). Click counters as integers. |
| `users` | IAM account — the single owner (extensible to staff later). |
| `policies` | IAM named policies; embeds `StatementSchema` (`{ effect, actions[] }`). |
| `groups` | IAM named groups: policy ids (+ optional inline statements). |
| `adminAuditLogs` | Append-only audit of every admin mutation. |

Categories (6: `PHONES, LAPTOPS, AUDIO, WEARABLES, CONSOLES, OTHER`), the condition taxonomy, and the grade glossary
are **fixed enums + a constants file** in `contracts` — **not** a `categories` collection. Brand is free text with a
per-category suggestion list. An append-only `click_events` table is **deferred** (product doc §8 note); v1 uses
integer counters on `products`.

### 4.2 `products` schema (Mongoose)

Fields (mirrors product doc §8, camelCased, Mongo-idiomatic):

```
slug            string, unique, immutable after create   (e.g. "iphone-13-128gb-uk-used-a3F9")
name            string, required
category        enum category_t, required
brand           string, required
condition       enum ('NEW'|'UK_USED'|'US_USED'|'NG_USED'), required
cosmeticGrade   enum ('A'|'B'|'C') | null                 (null iff condition = NEW)
priceNaira      number, required, integer, > 0
description     string, optional
stockType       enum ('RESTOCKABLE'|'UNIQUE_UNIT'), required
status          enum ('IN_STOCK'|'OUT_OF_STOCK'|'AVAILABLE'|'SOLD'), required
quantity        number | null                             (>=0 iff RESTOCKABLE, else null)
isVisible       boolean, default true
images          [{ key: string, sortOrder: number }]      (first by sortOrder = primary)
specs           [{ label: string, value: string }]
whatsappClickCount   number, default 0
instagramClickCount  number, default 0
createdAt / updatedAt  timestamps
```

Compound indexes (Equality→Sort rule): `{ isVisible:1, category:1, condition:1, priceNaira:1 }` for catalog;
a text index on `name + brand + description` for keyword search.

### 4.3 Domain invariants (`assertProductInvariants`, enforced model + zod)

- `condition = NEW` ⟺ `cosmeticGrade = null` ⟺ `stockType = RESTOCKABLE` ⟺ `status ∈ {IN_STOCK, OUT_OF_STOCK}` ⟺ `quantity ≥ 0`
- `condition ≠ NEW` ⟺ `cosmeticGrade ∈ {A,B,C}` ⟺ `stockType = UNIQUE_UNIT` ⟺ `status ∈ {AVAILABLE, SOLD}` ⟺ `quantity = null`
- `priceNaira` is a positive integer.
- **State machines:** RESTOCKABLE `IN_STOCK ⇄ OUT_OF_STOCK` (quantity 0 ⇒ OUT_OF_STOCK auto); UNIQUE_UNIT
  `AVAILABLE → SOLD` (one-way in normal use; un-SOLD allowed in admin as logged mistake-recovery). Sold/hidden rules
  per product doc §5.2/§5.3 (SOLD stays public & greyed; hidden ⇒ 404 everywhere).

## 5. DOE triad per entity

Every entity follows Adverta's uniform shapes:

- **Model `*DB` fns** — one per operation, single-object args, wrapped in `databaseResponseTimeHistogram`, `try/catch`
  swallowing to a safe empty value (`null`/`[]`/`false`). Reads `.lean<T>()`; create via `create([p]).then(a=>a[0])`;
  update via `findByIdAndUpdate(id,{$set},{ returnDocument:"after" }).lean()`; delete returns `deletedCount>0`.
  > Note (global rule): never use the deprecated `new` option on `findOneAndUpdate`/`findByIdAndUpdate` — use
  > `returnDocument: "after"`.
- **Service fns** — one file per op, barrel re-export, namespaced (`products.getProductBySlug(...)`). Reads =
  cache-get-or-set with a `getQueryKey`; writes = mutate then `invalidateCacheKeys`.
- **Routes** — `route.ts` exporting `GET/POST/PATCH/DELETE`, each `withApiHandler(...)`, admin mutations wrapped in
  `auditAdmin` and gated by `requirePermission` inside the leaf.

### 5.1 `products` triad

**Model `*DB`:** `listProductsDB`, `productFacetsDB`, `getProductBySlugDB` (visible+non-hidden, live/available),
`getProductBySlugAnyStatusDB` (admin), `getProductByIdDB`, `createProductDB`, `updateProductByIdDB`,
`deleteProductByIdDB`, `countProductsDB`, `incrementClickDB`.

**Services:** `getProductBySlug` (presign image keys on the way out), `listProducts` (composite globbable key; **never
caches empty**), `productFacets`, `createProduct`, `updateProduct` (`ALLOWED_KEYS` whitelist), `deleteProduct`,
`setStatus`, `setVisibility`, `incrementClick`, `utils/invalidateCacheKeys.ts`.

### 5.2 IAM triad (`users`, `policies`, `groups`)

Ported from Adverta. `resolveEffectivePermissions` service (Redis-cached, 30 s TTL, live re-resolve per request via
`requirePermission`), `invalidateEffectivePermissions({ userId })` on IAM edits. IAM management routes exist but are
minimal in v1 (single admin); the **primitives** are present so staff accounts are a data change, not a rewrite.

## 6. IAM catalog (`packages/contracts/src/iam.ts`)

- **Permissions** (`resource:action`): `products:write`, `products:read`, `analytics:read`, `audit:read`, `iam:manage`.
  `ALL_PERMISSIONS = Object.values(Permission)`.
- **Policy** = `{ effect: "Allow"|"Deny", actions: string[] }[]`; actions may be `*`, `resource:*`, or exact.
  `compileStatements` unions Allows then subtracts Denies (**explicit Deny wins**).
- **Built-ins:** policy `AdministratorAccess` (`actions: ["*"]`), group `Administrators`. Seed puts the owner in it.
- Public catalog reads require **no** permission. The **only public write** is the click beacon.

## 7. Caching & invalidation

Redis via an ioredis singleton on `global` (HMR-safe), boot-time ping that **fails loud** (no in-memory fallback).
Helpers: `redisRetrieveKeyString`, `redisUpdateKeyString` (`setex`), `redisDeleteKeys` (glob patterns expanded with
non-blocking cursor `SCAN`, never `KEYS`; batched `DEL`).

Keys (verbatim Adverta style):
- `services:products:getProductBySlug:${slug}` — TTL 5 min.
- `services:products:listProducts:${cat}:${q}:${cond}:${brand}:${min}:${max}:${sort}` — each unset filter → `*`.
- `services:products:productFacets` — TTL 5 min.
- `services:iam:resolveEffectivePermissions:${userId}` — TTL 30 s.

**Invalidation:** any product mutation → `invalidateCacheKeys({ slug })` deletes `listProducts:*` (SCAN glob) +
`getProductBySlug:${slug}` + `productFacets`. Click increments update the counter and invalidate that product's bySlug
key only (perfect accuracy not required; product doc §10). IAM edits → `invalidateEffectivePermissions`.

Public product pages in `apps/web` also use Next ISR; admin mutations trigger on-demand `revalidatePath`/`revalidateTag`
so CDN pages refresh within seconds (product doc AD-2), layered on top of the Redis service cache.

## 8. API surface

Public reads keyed by **slug**; admin mutations keyed by **id** under `/api/admin/*` (avoids a `[slug]`/`[id]` sibling
collision and matches the sitemap). Response envelope is always `{ code, message, data }`; handlers return `IEnvelope`,
never a raw `Response`; sentinel errors thrown and mapped by `handleError`.

```
GET   /api/products                    public list (URL filters → parseSearchParams)
GET   /api/products/facets             sidebar facet counts
GET   /api/products/[slug]             public detail (404 if hidden/not found)
POST  /api/products/[slug]/click       public beacon — rate-limited, body {channel:"whatsapp"|"instagram"} only
POST  /api/admin/login                 verify password, issue session cookie   (login rate-limited)
POST  /api/admin/logout                clear session
GET   /api/admin/products              admin list (status=all, incl. hidden)   [products:write]
POST  /api/admin/products              create                                   [products:write]
GET   /api/admin/products/[id]         admin detail                             [products:write]
PATCH /api/admin/products/[id]         update                                   [products:write]
DELETE /api/admin/products/[id]        delete                                   [products:write]
POST  /api/admin/products/[id]/status       flip status                         [products:write]
POST  /api/admin/products/[id]/visibility   toggle visibility                   [products:write]
POST  /api/admin/products/[id]/images       register/reorder uploaded images    [products:write]
```

Auth: HS256 JWT via `jose`, httpOnly + Secure + SameSite=Lax cookie; password argon2id (or bcrypt cost ≥ 12);
session re-validated in edge middleware for `/admin/**` **and** in every mutating route (`requirePermission`,
defense in depth). Image upload uses short-lived signed S3/Storage URLs minted by a permissioned route; the browser
never holds a write key. Global rate limit 100/min/IP via `withApiHandler`; login and click beacon get tighter scopes.

## 9. Design system & `apps/web`

The Claude Design project is **read-only source**. "Import" = **translate** its 9 screens into React
(Home/Catalog/Product/Visit-Us × mobile+desktop = 1a–1g, Admin dashboard 1h, Admin new-listing 1i); we do **not** push
back to the design project.

Tokens ported verbatim into `styles/global.ts`:
`--ink #141518`, `--paper #FAFAF7`, `--brand #0B7A3E` (hover `#08602F`), `--whatsapp #25D366` (**reserved — exactly one
CTA per screen**), `--amber #D98E04` (grade badges; text `#A16A03`), `--sold #8A8F98`, danger `#C4372F` (admin only).
Fonts: **Space Grotesk** (wordmark/titles/**prices** — prices are the loudest text after the name; tabular numerals),
**Instrument Sans** (body/UI, 16px base). Naira uses the real `₦` glyph, `₦450,000` formatting.

Signature components: `ConditionBadge` (solid-green NEW pill vs amber-outlined "UK USED · A"; grey for SOLD),
`ProductCard` (4:3 photo, 2-line name clamp, badge row, price; SOLD ribbon + desaturation), `TrustStrip`,
`WhatsAppButton` (`sendBeacon` click fires **before** navigation; prefilled `wa.me` deep link with name + price + URL),
photo gallery (swipe mobile / thumbnails desktop), sticky mobile WhatsApp bar, admin table, admin form.
`image-slot` custom elements → `next/image`.

Web layer mirrors Adverta: `hooks/<Domain>/use<Resource>.tsx` (SWR + shared axios `fetcher` with 401 refresh),
`libs/<Feature>Wrapper`, `components/<Name>/{index,styled}`, `constants/{routes,fetcher,seo}`, `helpers/format` (naira,
WhatsApp message builder), edge `server-http/proxy` gating `/admin/**` via `SECTION_PERMISSIONS`.

Routes: `/`, `/products`, `/products/[slug]`, `/contact`, `/admin/login`, `/admin`, `/admin/products/new`,
`/admin/products/[id]`. Filters live in URL query params (shareable, SSR-rendered). Per-product OpenGraph (photo +
name + price) so WhatsApp/Instagram link previews render — material for a chat-to-sell business (product doc §13/M4).

## 10. Milestones

- **M1 — Foundation (this plan):** monorepo scaffold; `contracts` (envelope, product enums + zod, IAM catalog,
  constants); `core` (databases, lib, constants/errors, metrics, middleware, 5 models, products + iam services,
  runtime); `services/api` (Hono app + adapter + manifest with routes above + `seed.ts`); `apps/web` scaffold + tokens
  + fetcher + proving home shell; **domain unit tests (TDD)**.
- **M2 — Admin panel:** login/session, dashboard table (1h) with quick status/visibility toggles + click column,
  create/edit form (1i) with photo upload + reorder, server-validated invariants. Ships first so the owner can load
  the real catalog.
- **M3 — Public catalog:** home (1a/1e), catalog grid + filters + search + facets (1b/1f), product page + gallery +
  WhatsApp deep link + click beacon (1c/1g), contact (1d), SOLD/OOS states, ISR revalidation wiring.
- **M4 — Polish & launch:** design pass, mobile perf audit, per-product SEO + OpenGraph, analytics column, deploy,
  owner walkthrough.

## 11. Testing

TDD for the domain layer (framework-free, in `packages/core`): `assertProductInvariants` (every valid/invalid
taxonomy combination), slug generation (human-readable + short unique suffix, stable after create), naira formatting
(tabular, `₦450,000`), WhatsApp message builder (`encodeURIComponent`, includes formatted price + URL), the two state
machines, and `compileStatements` (Allow/Deny precedence). Route/service integration tests use an ephemeral Mongo +
Redis. Definition-of-done for v1 mirrors product doc §13.

## 12. Confirmed items (previously open)

1. ₦ formatting = `₦450,000` (product doc §14.1). **Confirmed.**
2. WhatsApp prefill **appends the product URL** (`… on MoGadget — {siteUrl}/products/{slug}`). **Confirmed** (owner, 2026-07-07).
3. Featured-on-home = newest-first for v1 (admin "feature" toggle deferred). **Confirmed.**
4. Object storage = **AWS S3 (+ CloudFront)** — `core/lib/s3` mirrors Adverta (`getS3Instance` + signed upload URLs +
   CDN), wired in **M2**. M1 keeps image `key` → public `url` passthrough. **Confirmed** (owner, 2026-07-07).
5. Hosting = **local dev for now** (Mongo :27017 + Redis :6379); managed/self-hosted target chosen at M4. **Confirmed.**
6. Seed owner credentials = `owner` / `password` (override via `SEED_OWNER_USERNAME` / `SEED_OWNER_PASSWORD`); must be
   changed before any real deploy. **Confirmed.**
