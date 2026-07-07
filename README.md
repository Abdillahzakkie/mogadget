# MoGadget

Single-owner gadget catalog for a Lagos retailer (new & pre-owned electronics). Browse → chat to
order on WhatsApp/Instagram. **Not** a marketplace: no cart, checkout, payments, or customer accounts.

Built on the **Adverta "Golden Bite" architecture** — a Turborepo monorepo (`@mogadget/*`) with
MongoDB + Redis, a per-entity **Model → Service → Route** ("DOE") triad, ported IAM (users/groups/
policies + `withPermission`) seeded to a single superadmin, and Redis caching with glob-SCAN
invalidation.

## Layout

```
apps/web            @mogadget/web         Next.js App Router — public catalog + /admin
services/api        @mogadget/api         Hono host: routes + adapter + manifest + seed
packages/contracts  @mogadget/contracts   zod schemas + T* types + I*Dto + IAM catalog + constants
packages/core       @mogadget/core        models/ services/ lib/ middleware/ databases/ runtime/
packages/api-client @mogadget/api-client  (M2) typed transport client
```

## Quick start

```bash
# Mongo + Redis are hard requirements (bootstrap pings both at boot):
docker run --rm -d -p 27017:27017 mongo:7
docker run --rm -d -p 6379:6379 redis:7-alpine

yarn install
yarn seed                     # owner in Administrators, IAM built-ins, demo catalog
                              # → prints: owner / password
yarn workspace @mogadget/api start    # API on :4000
yarn workspace @mogadget/web dev      # web on :3000 (proxies /api → :4000)

yarn test                     # 35 tests across all workspaces (needs Mongo + Redis)
yarn ts.check                 # typecheck
```

## Status

- **M1 (foundation) — done.** Monorepo, contracts, core (Mongo/Redis/lib/middleware/models/services),
  Hono API (public product + admin CRUD + auth + click beacon), seed, and a catalog-wired web shell.
- **M2 — admin panel** (login UI, dashboard table, create/edit form + S3 image upload).
- **M3 — public catalog** (home, catalog + filters/search/facets, product page + gallery + WhatsApp
  deep link, contact, SOLD/OOS states, ISR).
- **M4 — polish, SEO/OpenGraph, deploy.**

See `docs/superpowers/specs/` (design) and `docs/superpowers/plans/` (M1 plan).

## Conventions

- Response envelope is always `{ code, message, data }`; handlers return `IEnvelope`, never a raw
  `Response`. Errors are thrown sentinels mapped by `handleError`.
- Permission strings are `resource:action`; explicit **Deny** wins in policy compilation.
- Product taxonomy invariants (`NEW ⟺ no grade ⟺ RESTOCKABLE ⟺ IN_STOCK/OUT_OF_STOCK`; pre-owned ⟺
  grade ⟺ UNIQUE_UNIT ⟺ AVAILABLE/SOLD) live in one domain function, enforced in the model and zod.
- Cache keys: `services:products:*`; any mutation deletes `listProducts:*` (SCAN glob) + the bySlug
  key + facets.
- **Change the seeded `owner`/`password` before any real deploy.**
