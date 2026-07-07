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

yarn test                     # 120 unit tests across all workspaces (needs Mongo + Redis)
yarn ts.check                 # typecheck
```

Copy `.env.example` → `.env` and set real secrets before any deploy (`SESSION_SECRET` and
`REVALIDATE_SECRET` must be **identical** in the API and web processes). In production
(`NODE_ENV=production`) the API **refuses to boot** if either is left at its dev default, and the
session cookie is issued `Secure`.

## Validation

The app ships with two automated safety nets, both run against real Mongo + Redis:

```bash
yarn test                     # 120 unit tests; enforces ≥95% coverage (statements/lines 100%,
                              # branches 97%, functions 99%). HTTP route handlers are covered by
                              # the e2e suite instead and excluded from the unit metric.
npx vitest run --coverage     # coverage report + threshold gate

# End-to-end (real browser → web → API → DB). Start Mongo/Redis + seed first, then:
yarn workspace @mogadget/api start &                 # :4000
yarn workspace @mogadget/web dev &                   # :3000 (or -p 3100)
E2E_BASE_URL=http://localhost:3000 \
  yarn workspace @mogadget/web e2e                   # 15 Playwright specs, every public + admin route
```

The e2e suite (`apps/web/e2e/`) drives every route and asserts real integration: seeded images
decode in the browser, filters/search/sort round-trip through the API, the WhatsApp CTA fires a
click beacon that persists to the DB, and the full admin create→edit→delete lifecycle persists at
each step. `yarn seed` now downloads real product photos into local blob storage so the catalog
renders with valid images out of the box.

## Status

- **M1 (foundation) — done.** Monorepo, contracts, core (Mongo/Redis/lib/middleware/models/services),
  Hono API (public product + admin CRUD + auth + click beacon), seed, and a catalog-wired web shell.
- **M2 (admin panel) — done.** Edge-gated `/admin`: login/session, dashboard table with quick
  status/visibility toggles + click column, taxonomy-aware create/edit form, and photo upload +
  reorder via pluggable storage (local disk now, AWS S3 later — no code change).
- **M3 (public catalog) — done.** Home (featured newest-first), catalog grid with URL-driven
  filters/search/price/sort + live facet counts, product page with photo gallery + spec grid + the
  single reserved WhatsApp CTA (click beacon fires before navigation) + Instagram, contact/visit-us,
  SOLD/OOS states, and on-demand ISR (admin edits refresh public pages within seconds).
- **M4 (polish & launch) — done.** Per-product SEO + OpenGraph/Twitter cards (rich WhatsApp/IG link
  previews), `sitemap.xml` + `robots.txt`, admin analytics summary, responsive/mobile pass (sticky
  mobile WhatsApp bar), and `.env.example` for deploy. Hosting target itself is still local-dev.

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

### Public catalog

Routes: `/` (home, featured newest-first), `/products` (grid + filter rail), `/products/[slug]`
(gallery + specs + WhatsApp/Instagram), `/contact`. All filter state lives in the URL query string
(`?category=PHONES&condition=UK_USED&min=100000&sort=price_asc`) so filtered views are shareable and
server-rendered; facet counts come from `GET /api/products/facets`. Hidden products 404 everywhere;
SOLD/OUT_OF_STOCK stay visible but greyed. The WhatsApp CTA is the single reserved-green button per
screen — tapping it fires a `sendBeacon` click before opening the prefilled `wa.me` deep link.

**SEO/SMO:** every product page emits `generateMetadata` with OpenGraph + Twitter cards (photo, name,
price) so WhatsApp/Instagram link previews render; `sitemap.xml` and `robots.txt` are generated
(`/admin` disallowed).

**On-demand ISR:** public reads are tagged (`products`, `product:<slug>`); after any admin mutation the
API fire-and-forgets a `POST {SITE_URL}/revalidate` (secret-gated by `REVALIDATE_SECRET`) so cached
pages refresh within seconds — layered on top of the Redis service cache. `revalidate: 300` is the
time-based backstop.

**Origin env:** `SITE_URL` (public web origin, used by the API for the revalidate webhook and by
`sitemap`/OG canonical URLs), `NEXT_PUBLIC_SITE_URL` (inlined for client-side WhatsApp links),
`REVALIDATE_SECRET` (must match between API and web). See `.env.example` for the full list.

See `docs/superpowers/specs/` (design) and `docs/superpowers/plans/` (M1/M2 plans).

## Conventions

- Response envelope is always `{ code, message, data }`; handlers return `IEnvelope`, never a raw
  `Response`. Errors are thrown sentinels mapped by `handleError`.
- Permission strings are `resource:action`; explicit **Deny** wins in policy compilation.
- Product taxonomy invariants (`NEW ⟺ no grade ⟺ RESTOCKABLE ⟺ IN_STOCK/OUT_OF_STOCK`; pre-owned ⟺
  grade ⟺ UNIQUE_UNIT ⟺ AVAILABLE/SOLD) live in one domain function, enforced in the model and zod.
- Cache keys: `services:products:*`; any mutation deletes `listProducts:*` (SCAN glob) + the bySlug
  key + facets.
- **Change the seeded `owner`/`password` before any real deploy.**
