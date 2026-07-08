# Managerenta-Layout Refactor — Design

**Date:** 2026-07-08
**Status:** Approved (design review passed; see approval trail in session)
**Scope decision:** Full collapse into a single Next.js app + full stack parity with Managerenta, executed in three phases with green checkpoints.

## 1. Motivation

Mogadget currently uses the Adverta-derived Turborepo layout: `apps/web` (Next.js),
`services/api` (standalone Hono service), `packages/core` (server logic),
`packages/contracts` (shared zod schemas) — two processes, workspace packages, a turbo
pipeline. Managerenta (`../managerenta`) is the house style going forward: a single
Next.js app, backend in `src/app/api` route handlers over `src/server/*`, and a distinct
frontend convention (`components` primitives / `layouts` chrome / `libs` page wrappers /
`hooks` per domain, styled-components). This refactor converges mogadget on that shape.

## 2. Target structure

```
mogadget/
├── package.json              single package, yarn classic; no workspaces, no turbo
├── next.config.ts  tsconfig.json  biome.json  vitest.config.ts  playwright.config.ts
├── scripts/seed.ts           (from services/api/src/scripts/seed.ts)
├── e2e/                      admin.spec.ts, public.spec.ts, support/ (single origin)
├── public/
└── src/
    ├── app/
    │   ├── (site)/           home, products, products/[slug], contact
    │   ├── admin/            login, (panel)/{dashboard, products/new, products/[id]}
    │   ├── api/              every entry of services/api routes/manifest.ts, 1:1:
    │   │   ├── products/route.ts, products/facets/, products/[slug]/, products/[slug]/click/
    │   │   ├── admin/login/, admin/logout/, admin/products/ (+ [id], [id]/status,
    │   │   │   [id]/visibility, [id]/images), admin/uploads/sign/
    │   │   ├── admin/uploads/blob/[key]/   local-driver blob GET + signed PUT
    │   │   └── health/  metrics/
    │   ├── layout.tsx  robots.ts  sitemap.ts  globals (via styles/)
    ├── server/               ← packages/core, near-verbatim; tests move with modules
    │   ├── constants/  databases/  domain/  models/  services/  middleware/
    │   ├── lib/              handler (withApiHandler), response, session, password,
    │   │                     storage, clientIp, requestContext, logger, validation, revalidate
    │   ├── validators/       ← packages/contracts (zod schemas + DTO types)
    │   ├── metrics/  runtime/
    ├── components/           primitives: ProductCard, Gallery, ConditionBadge, TrustStrip,
    │                         ChatCta, CatalogFilters, AdminStats, AdminTable, ProductForm…
    ├── layouts/              Navbar (ex-SiteHeader), Footer, AdminHeader, Toast
    ├── libs/                 page containers, each {index.tsx, styled.tsx, components/}:
    │                         HomeWrapper, CatalogWrapper, ProductDetailWrapper,
    │                         ContactWrapper, LoginWrapper, AdminWrapper, ProductFormWrapper
    ├── hooks/                Products/ (SWR hooks per domain), useToast
    ├── constants/  types/  styles/
```

Import alias: `@/*` → `src/*` (Managerenta convention), replacing `@mogadget/core`,
`@mogadget/contracts`, and relative reaches.

## 3. Architecture changes (not just moves)

- **Hono adapter removed.** `services/api/src/lib/adapter.ts` (`runRoute`) folds into a
  `withApiHandler` in `src/server/lib/handler.ts`, matching Managerenta's
  `withApiHandler({ route }, withAuth(handler))` composition. Per-request duties it
  keeps: session verification, request-ID, client-IP resolution into the
  AsyncLocalStorage request context, queued Set-Cookie emission. Existing
  `withPermission` / `withRateLimit` / `withAudit` middleware survive unchanged beneath it.
- **ISR revalidation webhook removed.** Product mutations call `revalidateTag()` /
  `revalidatePath()` in-process instead of POSTing to the web `/revalidate` route with a
  shared secret. `apps/web/src/app/revalidate/route.ts`, `triggerRevalidate`, and
  `REVALIDATE_SECRET` are deleted.
- **CORS layer removed.** The signed-upload PUT becomes same-origin; the `cors()` block
  in `services/api/src/app.ts` has no successor.
- **Client IP.** Next route handlers expose no raw socket, so the socket-address
  resolution (commit 33a5ee7) is replaced by header-based resolution still gated by
  `TRUST_PROXY` (Managerenta's `clientIp` approach). Known, accepted trust-model
  regression relative to socket identity: with `TRUST_PROXY=false` the per-IP rate-limit
  key degrades to a constant, making limits effectively global rather than per-caller.
  Acceptable because production deploys behind a proxy with `TRUST_PROXY=true`.
- **Env consolidation.** Deleted: `API_ORIGIN`, `REVALIDATE_SECRET`. Kept: `MONGODB_URI`,
  `REDIS_URL`, `SESSION_SECRET`, `SESSION_MAX_AGE`, `SITE_URL`, `NEXT_PUBLIC_SITE_URL`,
  `TRUST_PROXY`, storage driver vars, seed vars.
- **Metrics** stay prom-client, served at `/api/metrics` (Managerenta pattern).

## 4. Stack parity (Phase 2)

| Area | From | To |
|---|---|---|
| Next.js | 15.1 | 16.2 |
| React | 19.0 | 19.2 |
| TypeScript | 5.7 | 6.x |
| zod | 3 | 4 (breaking schema API changes) |
| mongoose | 8 | 9 |
| Password hashing | argon2 | bcrypt |
| Session tokens | jose | jsonwebtoken |
| Tooling configs | per-package | root biome/tsconfig/vitest/playwright copied from Managerenta |

- **argon2 → bcrypt is a deliberate parity choice, not an upgrade.** The only stored
  credential is the seeded owner account; a re-seed regenerates the hash, so no runtime
  dual-verification/migration path is needed.
- Phase 2 should also clear the 6 open Dependabot alerts (1 critical, 1 high); verify
  the dashboard after the bumps.
- Frontend parity libs (styled-components 6 + `StyledComponentsRegistry`,
  `nextjs-toploader`, `react-icons`) land in Phase 3 alongside the convention rewrite.

## 5. Frontend conventions (Phase 3)

- Inline style objects → styled-components (`styled.tsx` per unit).
- Pages become thin server components delegating to `libs/XxxWrapper` client containers.
- Reusable primitives stay/move to `src/components`; app chrome to `src/layouts`.
- Data fetching for client views through per-domain SWR hooks in `src/hooks`.
- Server components may keep direct service calls (catalog/detail pages are
  ISR-rendered server-side; they don't go through SWR).

## 6. Explicitly preserved

All features, routes, and public URLs exactly as today: public catalog + facets +
product detail + click beacon; admin CRUD, status/visibility, image uploads (local + S3
drivers); IAM (users/groups/policies/permissions); rate limiting; audit logs; session
auth; SEO (sitemap, robots, OpenGraph, ISR); seed script including the
production-password guard; the full e2e suite; ≥95 % unit coverage threshold. Unit
tests move with their modules; e2e moves to root and targets one origin.

## 7. Execution plan (agreed)

Branch: `refactor/managerenta-layout`. Three phases, each ending with
`ts.check` + unit tests + e2e green and a commit:

1. **Collapse** — monorepo → single Next.js app on the *current* stack. Hono manifest →
   `app/api` route handlers; core → `src/server`; contracts → `src/server/validators`;
   webhook → in-process revalidation; delete turbo/workspaces/adapter/CORS.
2. **Stack parity** — the table in §4; re-seed; Dependabot check.
3. **Frontend conventions** — §5; e2e must stay green pixel-for-pixel in behavior
   (visual styling may change only where styled-components conversion requires).

Rollback story: each phase is a single revertible commit on the branch; master stays
untouched until the branch merges.

## 8. Risks

- **zod 3→4 + mongoose 8→9 both break APIs** — concentrated in `validators/` and
  `models/`; unit suites around both are the safety net.
- **Route-handler parity bugs** (cookies, status codes, streaming blob serve) — e2e
  suite exercises login, CRUD, upload round-trip, hidden-slug 404, rate-limit paths.
- **Next 16 behavior changes** (async request APIs, caching defaults) — Phase 2 is
  isolated so regressions bisect cleanly.
- **styled-components conversion drift** — Phase 3 changes no logic; wrappers port JSX
  as-is before styling is converted.
