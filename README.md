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

yarn test                     # 39 tests across all workspaces (needs Mongo + Redis)
yarn ts.check                 # typecheck
```

## Status

- **M1 (foundation) — done.** Monorepo, contracts, core (Mongo/Redis/lib/middleware/models/services),
  Hono API (public product + admin CRUD + auth + click beacon), seed, and a catalog-wired web shell.
- **M2 (admin panel) — done.** Edge-gated `/admin`: login/session, dashboard table with quick
  status/visibility toggles + click column, taxonomy-aware create/edit form, and photo upload +
  reorder via pluggable storage (local disk now, AWS S3 later — no code change).
- **M3 — public catalog** (home, catalog + filters/search/facets, product page + gallery + WhatsApp
  deep link, contact, SOLD/OOS states, ISR).
- **M4 — polish, SEO/OpenGraph, deploy.**

### Admin

Sign in at `/admin/login` (seeded `owner` / `password`). The Next edge middleware verifies the
`mg_session` cookie for every `/admin/**` route; every mutating API route also re-checks
`products:write`. Images upload straight from the browser to a signed URL — the browser never holds a
storage write key.

**Storage env** (all optional; sensible local-dev defaults):

| Var | Default | Purpose |
|-----|---------|---------|
| `STORAGE_DRIVER` | `local` (or `s3` if `AWS_S3_BUCKET` set) | which driver to use |
| `API_ORIGIN` | `http://localhost:4000` | base for local `/uploads/*` URLs |
| `LOCAL_UPLOAD_DIR` | `.uploads` | on-disk store for the local driver |
| `AWS_S3_BUCKET` / `AWS_REGION` | — / `us-east-1` | S3 driver target |
| `CDN_BASE_URL` | — | public base for S3-served images |

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
