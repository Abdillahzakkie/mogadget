# Admin dashboard overhaul — filtering, richer table, analytics & click trends

**Date:** 2026-07-08
**Status:** Design approved, pending spec review
**Area:** `/admin` catalog dashboard (localhost:6060/admin)

## Goal

Make the admin catalog dashboard more detailed and add filtering plus
analytics — including time-series click trends. Scope was locked to the most
complete option in every dimension:

- **Analytics:** derived breakdowns/leaderboards **plus** time-series click trends.
- **Filtering:** text search, facet filters, sorting, and price range.
- **Detail:** more columns, expandable row detail, and result-count / empty states.

## Decomposition

Two coupled deliverables:

- **A. Click-event tracking (backend)** — the only genuinely new subsystem.
  Time-series trends require timestamped click data, which does not exist today
  (clicks are monotonic counters).
- **B. Dashboard overhaul (frontend)** — filtering, richer table, derived
  analytics, and the trend chart that consumes A. Everything in B except the
  trend chart runs client-side on the product list already loaded by
  `useAdminProducts`.

## Current state (constraints discovered)

- A click is a single atomic `$inc` on `whatsappClickCount` /
  `instagramClickCount` in `incrementClickDB` — **no timestamps**, so no trends.
- `Permission.AnalyticsRead = "analytics:read"` **already exists** in the IAM
  enum and is granted by `AdministratorAccess` (`*`). The new endpoint gates on it.
- **No chart library is installed.** Charts are built as lightweight inline SVG
  with styled-components — **no new dependency**.
- The admin table already loads the full product list in one call
  (`GET /admin/products`), so filtering, derived analytics, and expandable
  detail are all client-side with zero new backend.
- Component convention: each component is a folder with `index.tsx` +
  `styled.tsx`; data via SWR hooks in `src/hooks/`; client API in
  `src/lib/adminApi.ts`.

## A. Click-event tracking (backend)

### Model: `clickEvents`

New model registered in `src/server/models/index.ts` (`export * as clickEvents`).

Schema:

| Field       | Type                              | Notes                          |
|-------------|-----------------------------------|--------------------------------|
| `productId` | `ObjectId` (ref Product, indexed) | which listing                  |
| `slug`      | `string`                          | denormalized for convenience   |
| `channel`   | `"whatsapp" \| "instagram"`       | enum                           |
| `createdAt` | `Date`                            | event time (`{ timestamps }`)  |

Indexes:

- **TTL index** on `createdAt`, `expireAfterSeconds = 180 days` — automatic
  retention, no cron.
- `{ createdAt: 1, channel: 1 }` — supports the trend aggregation.

### Model fn: `clicksByDayDB({ since })`

Aggregation: `$match createdAt >= since` → `$group` by
`{ day: $dateToString(createdAt, "%Y-%m-%d"), channel }` → `$sum: 1`. Returns
sparse rows `[{ day, channel, count }]` (only days that have events).

### Service: `services.analytics.clickTrends({ days, now })`

- Validates `days ∈ {7, 14, 30, 90}` (default 30).
- Computes `since = now - days`.
- Calls `clicksByDayDB`, then **gap-fills** into a dense, ordered series:
  `[{ date, whatsapp, instagram }]` — one entry per day in range, zero-filled.
- Returns `{ days, series, totals: { whatsapp, instagram } }`.
- The dense-series builder is a **pure function** that takes `now` and the
  sparse rows as arguments (no `Date.now()` inside) so it is deterministic and
  unit-testable.

### Endpoint: `GET /api/admin/analytics/clicks?days=30`

- `requirePermission(Permission.AnalyticsRead)`.
- Validates `days` query param.
- Returns the service payload via `ok(...)`.

### Write path: `incrementClick`

After the existing counter `$inc` (unchanged — kept for fast table reads),
best-effort insert one `ClickEvent`. **A failed event insert must not fail the
click** (never regress the WhatsApp handoff) — wrap in try/catch, log at warn.

### Seed

`scripts/seed.ts` back-fills synthetic click events spread across the retention
window so the dev chart is not empty. This approximates existing counters; real
trends accrue from first deploy onward. Clearly a dev convenience, not real data.

## B. Dashboard overhaul (frontend)

`AdminWrapper` is refactored into focused sections, matching the existing
`AdminStats` / `AdminTable` split.

### `AdminStats` (enhanced)

Existing cards (Listings, Live, Sold, WhatsApp clicks, Instagram clicks) plus:

- **Inventory value (₦)** — sum of `priceNaira × quantity` over stock that is
  not SOLD (UNIQUE_UNIT SOLD units count as 0).
- **Low stock** — count of RESTOCKABLE listings with `quantity` at/under a
  `LOW_STOCK_THRESHOLD` constant (default 3).
- **Hidden** — count of `!isVisible`.

Stat cards reflect the **full catalog** (see UX decision below).

### `AdminAnalytics` (new section)

- **`ClicksTrend`** — SWR via new `useClickTrends(days)` hook → the analytics
  endpoint. Renders a reusable inline-SVG dual-area chart (WhatsApp green /
  Instagram) with a **7 / 30 / 90-day** range toggle. Responsive via `viewBox`.
  Loading + empty states.
- **`Breakdown`** — horizontal bars by category and by status (derived, all-time).
- **`TopListings`** — leaderboard of highest total clicks (derived).
- **`Alerts`** — derived anomaly chips: stale (>30d since `updatedAt`),
  low-stock, and visible-but-sold.

### `CatalogToolbar` (new)

Owns filter state. Controls:

- Text search (name / brand).
- Facet selects: category, condition, status, visibility, stock type.
- Price range: min / max naira.
- Sort: newest, price asc/desc, clicks asc/desc.

### `AdminTable` (enhanced)

- **New columns:** category, stock type, quantity, date added / age.
- **Expandable row:** specs, description, image count, created/updated timestamps.
- **Result count** "N of M listings" and a filtered-empty state.
- Preserves existing inline status/visibility toggle pills and their state
  machines (RESTOCKABLE: IN_STOCK⇄OUT_OF_STOCK; UNIQUE_UNIT: AVAILABLE⇄SOLD).

### Shared filter logic: `useProductFilters(products)`

Returns `{ filters, setFilter, filtered, counts }`. The filter/sort predicates
are **pure functions** (extracted, unit-testable). Consumed by `CatalogToolbar`
(controls) and `AdminTable` (results + count).

### UX decision — filter scope

**Filters scope the table only.** Stat cards and analytics stay
**catalog-wide** so "inventory value" and "clicks by category" are stable KPIs
that don't shift as the table is filtered.

## Testing

Vitest, coverage held ≥95% with real (non-theater) tests:

- `clicksByDayDB` aggregation against an isolated throwaway DB (unique per-run
  name, full teardown in `afterAll`).
- The pure dense-series / gap-fill builder — deterministic via injected `now`.
- Endpoint permission guard (401/403 without `AnalyticsRead`).
- `incrementClick` writes both counter and event; event-failure does not fail
  the click.
- Pure filter/sort predicates from `useProductFilters`.

The chart is presentational (SVG) — not unit-tested beyond render smoke.

## Non-goals

- No per-visitor identity, geo, sessionization, or funnel — just click volume by
  channel per day. Inherits the click route's existing rate-limit and its lack
  of per-user dedup.
- No new charting dependency.
- Filters do not affect analytics/stats (catalog-wide by design).

## Defaults (approved)

1. Retention = **180 days** (TTL).
2. Filters scope the **table only**; analytics/stats stay catalog-wide.
3. Seed **back-fills synthetic events** so the dev chart has data.
