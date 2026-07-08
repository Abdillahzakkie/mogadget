# MoGadget

Single-owner gadget catalog for a Lagos retailer (new & pre-owned electronics). Browse → chat to
order on WhatsApp/Instagram. **Not** a marketplace: no cart, checkout, payments, or customer accounts.

A single **Next.js app** (Managerenta-style layout): the backend lives in `src/app/api` route
handlers over `src/server/*`, with MongoDB + Redis, a per-entity **Model → Service → Route** triad,
ported IAM (users/groups/policies + `withPermission`) seeded to a single superadmin, and Redis
caching with glob-SCAN invalidation.

## Layout

```
src/app             App Router — public catalog, /admin, and all /api route handlers
src/server          constants/ databases/ domain/ helpers/ lib/ metrics/ middleware/
                    models/ runtime/ services/ validators/ (zod schemas + DTO types + IAM)
src/components      reusable UI primitives
src/layouts         app chrome (navbar, footer, admin header)
src/libs            page containers (XxxWrapper)
src/hooks           per-domain SWR hooks
scripts/seed.ts     seed: owner + IAM built-ins + demo catalog (with real photos)
e2e/                Playwright suite (single origin)
```

## Quick start

```bash
# Mongo + Redis are hard requirements (bootstrap pings both at boot):
docker run --rm -d -p 27017:27017 mongo:7
docker run --rm -d -p 6379:6379 redis:7-alpine

yarn install
yarn seed                     # owner in Administrators, IAM built-ins, demo catalog
                              # → prints: owner / password
yarn dev                      # app on :3000 (frontend + API, one origin)

yarn test                     # unit tests (needs Mongo + Redis)
yarn ts.check                 # typecheck
```

Copy `.env.example` → `.env` and set real secrets before any deploy. In production
(`NODE_ENV=production`) the app **refuses to boot** if `SESSION_SECRET` is left at its dev
default, and the session cookie is issued `Secure`.

## Validation

The app ships with two automated safety nets, both run against real Mongo + Redis:

```bash
yarn test                     # unit tests; enforces ≥95% coverage. HTTP route handlers are
                              # covered by the e2e suite instead and excluded from the unit metric.
npx vitest run --coverage     # coverage report + threshold gate

# End-to-end (real browser → app → DB). Start Mongo/Redis + seed first, then:
yarn build
SITE_URL=http://localhost:3100 yarn start -p 3100 &
E2E_BASE_URL=http://localhost:3100 yarn e2e          # Playwright specs, every public + admin route
```

The e2e suite (`e2e/`) drives every route and asserts real integration: seeded images decode in
the browser, filters/search/sort round-trip through the API, the WhatsApp CTA fires a click beacon
that persists to the DB, and the full admin create→edit→delete lifecycle persists at each step.
`yarn seed` downloads real product photos into local blob storage so the catalog renders with
valid images out of the box.

## Status

- **M1 (foundation) — done.** Contracts, core (Mongo/Redis/lib/middleware/models/services),
  API (public product + admin CRUD + auth + click beacon), seed, and a catalog-wired web shell.
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
- **Refactor — managerenta layout.** Monorepo (web + Hono API + packages) collapsed into this
  single Next.js app; stack parity + frontend conventions per
  `docs/superpowers/specs/2026-07-08-managerenta-layout-refactor-design.md`.

### Admin

Sign in at `/admin/login` (seeded `owner` / `password`). The Next edge middleware verifies the
`mg_session` cookie for every `/admin/**` route; every mutating API route also re-checks
`products:write`. Images upload straight from the browser to a signed URL — the browser never holds a
storage write key.

**Storage env** (all optional; sensible local-dev defaults):

| Var | Default | Purpose |
|-----|---------|---------|
| `STORAGE_DRIVER` | `local` (or `s3` if `AWS_S3_BUCKET` set) | which driver to use |
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

**On-demand ISR:** public reads are tagged (`products`, `product:<slug>`); after any admin mutation
the app calls `revalidateTag()` in-process so cached pages refresh within seconds — layered on top
of the Redis service cache. `revalidate: 300` is the time-based backstop.

**Origin env:** `SITE_URL` (public origin, used by SSR self-fetches and `sitemap`/OG canonical
URLs), `NEXT_PUBLIC_SITE_URL` (inlined for client-side WhatsApp links). See `.env.example` for the
full list.

See `docs/superpowers/specs/` (design) and `docs/superpowers/plans/` (plans).

## Conventions

- Response envelope is always `{ code, message, data }`; handlers return `IEnvelope`, and
  `withApiHandler` serializes it to the wire `Response`. Errors are thrown sentinels mapped by
  `handleError`.
- Permission strings are `resource:action`; explicit **Deny** wins in policy compilation.
- Product taxonomy invariants (`NEW ⟺ no grade ⟺ RESTOCKABLE ⟺ IN_STOCK/OUT_OF_STOCK`; pre-owned ⟺
  grade ⟺ UNIQUE_UNIT ⟺ AVAILABLE/SOLD) live in one domain function, enforced in the model and zod.
- Cache keys: `services:products:*`; any mutation deletes `listProducts:*` (SCAN glob) + the bySlug
  key + facets.
- **Change the seeded `owner`/`password` before any real deploy.**
