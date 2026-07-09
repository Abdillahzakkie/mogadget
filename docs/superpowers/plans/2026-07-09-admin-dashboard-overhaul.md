# Admin Dashboard Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add filtering, a richer product table, derived analytics, and time-series click-trend charts to the `/admin` catalog dashboard, backed by a new timestamped click-event store.

**Architecture:** One new backend subsystem — an append-only `clickEvents` collection (TTL-retained) plus an aggregation service and a permission-gated endpoint — provides the only data the dashboard can't already derive. Everything else is client-side over the full product list the admin table already loads (`useAdminProducts`). Filter/sort logic and the trend-series builder are extracted as pure functions so they're unit-tested; charts are inline SVG (no new dependency).

**Tech Stack:** Next.js 16.2 (App Router, `runtime = "nodejs"` route handlers), Mongoose 9.6 + MongoDB, Redis (cache only), styled-components 6.4, SWR 2.4, React 19.2, Vitest 4 (+ v8 coverage), Playwright (e2e for routes/components).

## Global Constraints

- **Design spec (authoritative):** `docs/superpowers/specs/2026-07-08-admin-analytics-design.md`. Every task implements part of it.
- **Filter scope:** filters affect the **table only**. `AdminStats` and `AdminAnalytics` stay **catalog-wide**.
- **Click write path must never regress:** a failed click-event insert MUST NOT fail the click/WhatsApp handoff — wrap in try/catch, log at warn.
- **Retention:** `clickEvents` TTL = **180 days** (`180 * 24 * 60 * 60` seconds).
- **Valid trend windows:** `days ∈ {7, 14, 30, 90}`, default **30**; anything else clamps to 30.
- **No new npm dependency.** Charts are inline SVG + styled-components.
- **Permission:** the analytics endpoint gates on `Permission.AnalyticsRead` (already in the IAM enum, granted by `AdministratorAccess`).
- **Mongoose:** never use the deprecated `new` option — use `returnDocument: "after" | "before"`.
- **Tests never touch the real/dev DB:** new DB-backed tests connect the default mongoose connection to a **unique per-run throwaway database** (`connectThrowawayDB`) and **drop it** in `afterAll`. Pure logic is tested without a DB.
- **Coverage:** global Vitest thresholds are 95% (statements/lines/functions/branches). Coverage `include` is `src/server/**`, `src/lib/**`, `src/helpers/**`; it **excludes** `**/index.ts`, `**/types.ts`, `**/*.tsx`, and `src/app/**`. Put logic that must be tested outside those excluded paths; keep presentational logic in `.tsx`.
- **Commits:** conventional-commit messages, no `Co-Authored-By` trailer.
- **Run all tests with:** `pnpm test` (which is `vitest run`). Type-check with `pnpm ts.check`.

---

## File Structure

**Backend — new:**
- `src/server/models/clickEvents/types.ts` — `IClickEvent` interface.
- `src/server/models/clickEvents/index.ts` — schema, model, `insertClickEventDB`, `clicksByDayDB`.
- `src/server/services/analytics/buildTrendSeries.ts` — pure dense-series builder.
- `src/server/services/analytics/clickTrends.ts` — service (validates window, queries, builds).
- `src/server/services/analytics/index.ts` — barrel.
- `src/app/api/admin/analytics/clicks/route.ts` — `GET` endpoint.
- `src/test/throwawayDb.ts` — shared test helper (isolated DB connect/drop).

**Backend — modified:**
- `src/server/models/index.ts` — register `clickEvents`.
- `src/server/models/products/index.ts` — `incrementClickDB` returns the product id.
- `src/server/models/products/types.ts` — no change (re-export already present).
- `src/server/services/products/incrementClick.ts` — best-effort event write.
- `src/server/services/index.ts` — register `analytics`.
- `src/server/validators/types.ts` — add `ITrendPoint`, `IClickTrends`, `IClickDayRow`.
- `scripts/seed.ts` — back-fill synthetic click events.

**Frontend — new:**
- `src/lib/productFilters.ts` — pure filter/sort predicates + types (unit-tested).
- `src/hooks/Products/useProductFilters.ts` — filter state hook.
- `src/hooks/Analytics/useClickTrends.ts` — SWR hook for the trend endpoint.
- `src/components/CatalogToolbar/index.tsx` + `styled.tsx` — filter controls.
- `src/components/AdminAnalytics/index.tsx` + `styled.tsx` — analytics section (trend chart, breakdown, top listings, alerts).

**Frontend — modified:**
- `src/libs/AdminWrapper/index.tsx` — owns product fetch + filter state; composes sections.
- `src/components/AdminTable/index.tsx` — props-driven; new columns, expandable rows, count/empty states.
- `src/components/AdminTable/styled.tsx` — styles for new columns/expandable row.
- `src/components/AdminStats/index.tsx` — inventory value, low stock, hidden cards.

**Tests — new:**
- `src/server/services/analytics/buildTrendSeries.test.ts`
- `src/server/services/analytics/clickTrends.test.ts` (throwaway DB)
- `src/server/services/products/incrementClickEvents.test.ts` (throwaway DB)
- `src/lib/productFilters.test.ts`
- `e2e/admin-analytics.spec.ts`

---

## Task 1: ClickEvent model — schema, insert, and day aggregation

**Files:**
- Create: `src/server/models/clickEvents/types.ts`
- Create: `src/server/models/clickEvents/index.ts`
- Create: `src/test/throwawayDb.ts`
- Modify: `src/server/models/index.ts`
- Modify: `src/server/validators/types.ts`
- Test: `src/server/services/analytics/clickTrends.test.ts` (aggregation half added here; service half in Task 3)

**Interfaces:**
- Consumes: `TClickChannel` from `@/server/validators/types`; `env` from `@/server/constants/environments`.
- Produces:
  - `IClickEvent { _id: string; productId: string; slug: string; channel: TClickChannel; createdAt: Date }`
  - `insertClickEventDB(input: { productId: string; slug: string; channel: TClickChannel; createdAt?: Date }): Promise<void>`
  - `clicksByDayDB(args: { since: Date }): Promise<IClickDayRow[]>` where `IClickDayRow { day: string; channel: TClickChannel; count: number }`
  - `ClickEvent` mongoose model (for tests/seed).
  - Shared DTO types `ITrendPoint`, `IClickTrends`, `IClickDayRow` in `validators/types.ts`.
  - Test helpers `connectThrowawayDB(label: string): Promise<string>` and `dropThrowawayDB(): Promise<void>`.

- [ ] **Step 1: Add shared trend DTO types**

In `src/server/validators/types.ts`, append after the existing `TClickChannel` type block (keep it near the other channel types):

```ts
export interface IClickDayRow {
  day: string; // "YYYY-MM-DD" (UTC)
  channel: TClickChannel;
  count: number;
}
export interface ITrendPoint {
  date: string; // "YYYY-MM-DD" (UTC)
  whatsapp: number;
  instagram: number;
}
export interface IClickTrends {
  days: number;
  series: ITrendPoint[];
  totals: { whatsapp: number; instagram: number };
}
```

- [ ] **Step 2: Create the ClickEvent domain type**

Create `src/server/models/clickEvents/types.ts`:

```ts
import type { TClickChannel } from "@/server/validators/types";

export interface IClickEvent {
  _id: string;
  productId: string;
  slug: string;
  channel: TClickChannel;
  createdAt: Date;
}
```

- [ ] **Step 3: Create the model + `insertClickEventDB` + `clicksByDayDB`**

Create `src/server/models/clickEvents/index.ts`. Note: `createdAt` is an explicit field (NOT `{ timestamps: true }`) so the seed can back-fill historical dates; the TTL index lives on it.

```ts
import mongoose, { type Model } from "mongoose";
import type { IClickDayRow, TClickChannel } from "@/server/validators/types";
import { databaseResponseTimeHistogram, IOperationType } from "../../metrics";
import type { IClickEvent } from "./types";

const collectionName = "clickEvents";
const RETENTION_SECONDS = 180 * 24 * 60 * 60; // 180 days

const ClickEventSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    slug: { type: String, required: true },
    channel: { type: String, required: true, enum: ["whatsapp", "instagram"] },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { collection: collectionName, versionKey: false },
);
// Automatic retention — no cron. TTL must be a single-field index.
ClickEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });
// Supports the day/channel trend aggregation.
ClickEventSchema.index({ createdAt: 1, channel: 1 });

export const ClickEvent: Model<IClickEvent> =
  (mongoose.models.ClickEvent as Model<IClickEvent>) ||
  mongoose.model<IClickEvent>("ClickEvent", ClickEventSchema);

export async function insertClickEventDB(input: {
  productId: string;
  slug: string;
  channel: TClickChannel;
  createdAt?: Date;
}): Promise<void> {
  await ClickEvent.create([
    {
      productId: input.productId,
      slug: input.slug,
      channel: input.channel,
      createdAt: input.createdAt ?? new Date(),
    },
  ]);
}

// Sparse daily counts (only days that have events), grouped by UTC day + channel.
export async function clicksByDayDB({ since }: { since: Date }): Promise<IClickDayRow[]> {
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    const rows = await ClickEvent.aggregate<IClickDayRow>([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
            channel: "$channel",
          },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, day: "$_id.day", channel: "$_id.channel", count: 1 } },
    ]);
    timer({
      operation: IOperationType.Read,
      collection: collectionName,
      method: "clicksByDayDB",
      success: "true",
    });
    return rows;
  } catch {
    timer({
      operation: IOperationType.Read,
      collection: collectionName,
      method: "clicksByDayDB",
      success: "false",
    });
    return [];
  }
}

export default ClickEvent;
export * from "./types";
```

- [ ] **Step 4: Register the model in the models barrel**

In `src/server/models/index.ts`, add the export (keep alphabetical-ish ordering next to the others):

```ts
export * as adminAuditLogs from "./adminAuditLogs";
export * as clickEvents from "./clickEvents";
export * as groups from "./groups";
export * as policies from "./policies";
export * as products from "./products";
export * as users from "./users";
```

- [ ] **Step 5: Create the shared throwaway-DB test helper**

Create `src/test/throwawayDb.ts`. This is not under a coverage-`include` path and is not a `*.test.ts`, so it is neither run as a test nor counted for coverage.

```ts
import mongoose from "mongoose";
import { env } from "@/server/constants/environments";

// Connects the DEFAULT mongoose connection to a unique, per-run throwaway database so tests
// never read or write the real/dev DB. Mongoose models bind to the default connection at query
// time, so calling this in beforeAll (before any query) is sufficient. Pair with
// dropThrowawayDB() in afterAll to drop the DB and disconnect.
export async function connectThrowawayDB(label: string): Promise<string> {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  const dbName = `mogadget-test-${label}-${process.pid}-${Date.now()}`;
  await mongoose.connect(env.mongoUri, { dbName });
  return dbName;
}

export async function dropThrowawayDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
```

- [ ] **Step 6: Write the failing aggregation test**

Create `src/server/services/analytics/clickTrends.test.ts` (the service assertions come in Task 3; start with the aggregation):

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clicksByDayDB, insertClickEventDB } from "../../models/clickEvents";
import { connectThrowawayDB, dropThrowawayDB } from "../../../test/throwawayDb";

const PID = "0123456789abcdef01234567";

describe("clickEvents aggregation + clickTrends service", () => {
  beforeAll(async () => {
    await connectThrowawayDB("clicktrends");
  });
  afterAll(async () => {
    await dropThrowawayDB();
  });

  it("clicksByDayDB groups events by UTC day and channel", async () => {
    const d1 = new Date("2026-06-01T10:00:00.000Z");
    const d2 = new Date("2026-06-01T23:30:00.000Z");
    const d3 = new Date("2026-06-02T00:30:00.000Z");
    await insertClickEventDB({ productId: PID, slug: "a", channel: "whatsapp", createdAt: d1 });
    await insertClickEventDB({ productId: PID, slug: "a", channel: "whatsapp", createdAt: d2 });
    await insertClickEventDB({ productId: PID, slug: "a", channel: "instagram", createdAt: d1 });
    await insertClickEventDB({ productId: PID, slug: "a", channel: "whatsapp", createdAt: d3 });

    const rows = await clicksByDayDB({ since: new Date("2026-06-01T00:00:00.000Z") });
    const find = (day: string, ch: string) =>
      rows.find((r) => r.day === day && r.channel === ch)?.count ?? 0;

    expect(find("2026-06-01", "whatsapp")).toBe(2);
    expect(find("2026-06-01", "instagram")).toBe(1);
    expect(find("2026-06-02", "whatsapp")).toBe(1);
  });

  it("clicksByDayDB excludes events before `since`", async () => {
    const rows = await clicksByDayDB({ since: new Date("2026-06-02T00:00:00.000Z") });
    expect(rows.every((r) => r.day >= "2026-06-02")).toBe(true);
  });
});
```

- [ ] **Step 7: Run the aggregation test to verify it passes**

Run: `pnpm test -- src/server/services/analytics/clickTrends.test.ts`
Expected: PASS (a local MongoDB must be running at `MONGODB_URI`; the suite creates and drops its own DB).

- [ ] **Step 8: Commit**

```bash
git add src/server/models/clickEvents src/server/models/index.ts src/server/validators/types.ts src/test/throwawayDb.ts src/server/services/analytics/clickTrends.test.ts
git commit -m "feat(analytics): clickEvents model with TTL retention and daily aggregation"
```

---

## Task 2: Pure dense-series builder

**Files:**
- Create: `src/server/services/analytics/buildTrendSeries.ts`
- Test: `src/server/services/analytics/buildTrendSeries.test.ts`

**Interfaces:**
- Consumes: `IClickDayRow`, `IClickTrends`, `ITrendPoint` from `@/server/validators/types`.
- Produces: `buildTrendSeries(args: { now: Date; days: number; rows: IClickDayRow[] }): IClickTrends` — deterministic (no `Date.now()` inside), one dense entry per UTC day from `(now - (days-1))` to `now` inclusive, zero-filled, plus channel totals.

- [ ] **Step 1: Write the failing test**

Create `src/server/services/analytics/buildTrendSeries.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { IClickDayRow } from "@/server/validators/types";
import { buildTrendSeries } from "./buildTrendSeries";

const NOW = new Date("2026-07-09T12:00:00.000Z");

describe("buildTrendSeries", () => {
  it("produces one dense, ordered entry per day ending at `now` (UTC)", () => {
    const out = buildTrendSeries({ now: NOW, days: 7, rows: [] });
    expect(out.days).toBe(7);
    expect(out.series).toHaveLength(7);
    expect(out.series[0].date).toBe("2026-07-03");
    expect(out.series[6].date).toBe("2026-07-09");
    expect(out.series.every((p) => p.whatsapp === 0 && p.instagram === 0)).toBe(true);
    expect(out.totals).toEqual({ whatsapp: 0, instagram: 0 });
  });

  it("maps sparse rows onto the right days and sums totals", () => {
    const rows: IClickDayRow[] = [
      { day: "2026-07-09", channel: "whatsapp", count: 3 },
      { day: "2026-07-09", channel: "instagram", count: 1 },
      { day: "2026-07-07", channel: "whatsapp", count: 2 },
    ];
    const out = buildTrendSeries({ now: NOW, days: 7, rows });
    const last = out.series[6];
    expect(last).toEqual({ date: "2026-07-09", whatsapp: 3, instagram: 1 });
    expect(out.series.find((p) => p.date === "2026-07-07")).toEqual({
      date: "2026-07-07",
      whatsapp: 2,
      instagram: 0,
    });
    expect(out.totals).toEqual({ whatsapp: 5, instagram: 1 });
  });

  it("ignores rows outside the window", () => {
    const rows: IClickDayRow[] = [{ day: "2026-01-01", channel: "whatsapp", count: 9 }];
    const out = buildTrendSeries({ now: NOW, days: 7, rows });
    expect(out.totals).toEqual({ whatsapp: 0, instagram: 0 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/server/services/analytics/buildTrendSeries.test.ts`
Expected: FAIL (`buildTrendSeries` not found).

- [ ] **Step 3: Implement the builder**

Create `src/server/services/analytics/buildTrendSeries.ts`:

```ts
import type { IClickDayRow, IClickTrends, ITrendPoint } from "@/server/validators/types";

function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Pure, deterministic. Given the sparse per-day rows and the reference `now`, emit a dense,
// chronologically-ordered series of `days` entries ending on `now`'s UTC day, zero-filled,
// with channel totals over the window.
export function buildTrendSeries({
  now,
  days,
  rows,
}: {
  now: Date;
  days: number;
  rows: IClickDayRow[];
}): IClickTrends {
  const key = (day: string, ch: string) => `${day}|${ch}`;
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(key(r.day, r.channel), r.count);

  const series: ITrendPoint[] = [];
  let whatsapp = 0;
  let instagram = 0;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const date = utcDay(d);
    const wa = counts.get(key(date, "whatsapp")) ?? 0;
    const ig = counts.get(key(date, "instagram")) ?? 0;
    whatsapp += wa;
    instagram += ig;
    series.push({ date, whatsapp: wa, instagram: ig });
  }
  return { days, series, totals: { whatsapp, instagram } };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/server/services/analytics/buildTrendSeries.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/analytics/buildTrendSeries.ts src/server/services/analytics/buildTrendSeries.test.ts
git commit -m "feat(analytics): pure dense click-trend series builder"
```

---

## Task 3: clickTrends service + analytics barrel

**Files:**
- Create: `src/server/services/analytics/clickTrends.ts`
- Create: `src/server/services/analytics/index.ts`
- Modify: `src/server/services/index.ts`
- Test: `src/server/services/analytics/clickTrends.test.ts` (extend Task 1's file)

**Interfaces:**
- Consumes: `clicksByDayDB` (Task 1), `buildTrendSeries` (Task 2), `IClickTrends`.
- Produces: `clickTrends(args: { days?: number; now?: Date }): Promise<IClickTrends>` — clamps `days` to `{7,14,30,90}` (default 30), computes `since` = start (00:00 UTC) of the earliest day, queries, and builds the dense series. Exposed as `services.analytics.clickTrends`.

- [ ] **Step 1: Write the failing service test (extend the Task 1 file)**

Append to `src/server/services/analytics/clickTrends.test.ts` inside the existing `describe`, after the aggregation tests:

```ts
  it("clickTrends clamps invalid windows to 30 days", async () => {
    const { default: clickTrends } = await import("./clickTrends");
    const now = new Date("2026-06-10T12:00:00.000Z");
    const out = await clickTrends({ days: 999, now });
    expect(out.days).toBe(30);
    expect(out.series).toHaveLength(30);
  });

  it("clickTrends returns dense series with totals from stored events", async () => {
    const { default: clickTrends } = await import("./clickTrends");
    const now = new Date("2026-06-02T12:00:00.000Z");
    // Events from Task 1 are on 2026-06-01 (2 wa, 1 ig) and 2026-06-02 (1 wa).
    const out = await clickTrends({ days: 7, now });
    expect(out.series).toHaveLength(7);
    expect(out.series[out.series.length - 1].date).toBe("2026-06-02");
    expect(out.totals.whatsapp).toBe(3);
    expect(out.totals.instagram).toBe(1);
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test -- src/server/services/analytics/clickTrends.test.ts`
Expected: FAIL (cannot resolve `./clickTrends`).

- [ ] **Step 3: Implement the service**

Create `src/server/services/analytics/clickTrends.ts`:

```ts
import type { IClickTrends } from "@/server/validators/types";
import { clicksByDayDB } from "../../models/clickEvents";
import { buildTrendSeries } from "./buildTrendSeries";

const VALID_DAYS = [7, 14, 30, 90];
const DEFAULT_DAYS = 30;

export default async function clickTrends({
  days,
  now,
}: {
  days?: number;
  now?: Date;
}): Promise<IClickTrends> {
  const window = VALID_DAYS.includes(days ?? DEFAULT_DAYS) ? (days as number) : DEFAULT_DAYS;
  const at = now ?? new Date();

  // Start of the earliest day in range, at 00:00 UTC.
  const since = new Date(at);
  since.setUTCDate(since.getUTCDate() - (window - 1));
  since.setUTCHours(0, 0, 0, 0);

  const rows = await clicksByDayDB({ since });
  return buildTrendSeries({ now: at, days: window, rows });
}
```

- [ ] **Step 4: Create the analytics service barrel**

Create `src/server/services/analytics/index.ts`:

```ts
export { default as clickTrends } from "./clickTrends";
```

- [ ] **Step 5: Register analytics in the services barrel**

In `src/server/services/index.ts`:

```ts
export * as analytics from "./analytics";
export * as iam from "./iam";
export * as products from "./products";
```

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm test -- src/server/services/analytics/clickTrends.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/server/services/analytics/clickTrends.ts src/server/services/analytics/index.ts src/server/services/index.ts src/server/services/analytics/clickTrends.test.ts
git commit -m "feat(analytics): clickTrends service with windowed, gap-filled series"
```

---

## Task 4: Write path — record a click event on each click

**Files:**
- Modify: `src/server/models/products/index.ts:218-232` (`incrementClickDB`)
- Modify: `src/server/models/products/products.test.ts:39-42` (return-type assertion)
- Modify: `src/server/services/products/incrementClick.ts`
- Test: `src/server/services/products/incrementClickEvents.test.ts`

**Interfaces:**
- Consumes: `insertClickEventDB` (Task 1), `getLogger` from `../../lib/logger`.
- Produces: `incrementClickDB(args: { slug: string; channel: TClickChannel }): Promise<string | null>` — returns the product id on success (was `boolean`), `null` on miss/error. Service `incrementClick` unchanged signature (`Promise<boolean>`), now best-effort-inserts a `ClickEvent`.

- [ ] **Step 1: Update the existing model test to expect an id**

In `src/server/models/products/products.test.ts`, change the "increments a click counter by slug" test (lines 39-42) to:

```ts
  it("increments a click counter by slug and returns the product id", async () => {
    const id = await incrementClickDB({ slug: p.slug, channel: "whatsapp" });
    expect(typeof id).toBe("string");
    expect((await getProductBySlugDB({ slug: p.slug }))?.whatsappClickCount).toBe(1);
    expect(await incrementClickDB({ slug: "does-not-exist", channel: "whatsapp" })).toBeNull();
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test -- src/server/models/products/products.test.ts`
Expected: FAIL (`incrementClickDB` currently returns `true`, so `typeof id === "string"` fails).

- [ ] **Step 3: Change `incrementClickDB` to return the product id**

In `src/server/models/products/index.ts`, replace the `incrementClickDB` function (lines 218-232) with:

```ts
export async function incrementClickDB({
  slug,
  channel,
}: {
  slug: string;
  channel: TClickChannel;
}): Promise<string | null> {
  try {
    const field = channel === "whatsapp" ? "whatsappClickCount" : "instagramClickCount";
    const doc = await Product.findOneAndUpdate(
      { slug },
      { $inc: { [field]: 1 } },
      { returnDocument: "after", projection: { _id: 1 } },
    ).lean<{ _id: string } | null>();
    return doc ? String(doc._id) : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the model test to verify it passes**

Run: `pnpm test -- src/server/models/products/products.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing service test (throwaway DB)**

Create `src/server/services/products/incrementClickEvents.test.ts`:

```ts
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { connectThrowawayDB, dropThrowawayDB } from "../../../test/throwawayDb";
import { connectRedis, redis } from "../../databases/redis";
import { ClickEvent } from "../../models/clickEvents";
import { createProductDB } from "../../models/products";
import incrementClick from "./incrementClick";

const base = {
  name: "ClickEvt Phone",
  category: "PHONES",
  brand: "iPhone",
  condition: "NEW",
  cosmeticGrade: null,
  priceNaira: 500000,
  stockType: "RESTOCKABLE",
  status: "IN_STOCK",
  quantity: 5,
  description: null,
  images: [],
  specs: [],
} as const;

describe("incrementClick — click-event write path", () => {
  beforeAll(async () => {
    await connectThrowawayDB("clickevents-write");
    await connectRedis();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  afterAll(async () => {
    await redis.quit();
    await dropThrowawayDB();
  });

  it("increments the counter AND records a timestamped ClickEvent", async () => {
    const doc = await createProductDB({ ...base, slug: "clickevt-a" });
    const slug = doc!.slug;

    expect(await incrementClick({ slug, channel: "whatsapp" })).toBe(true);

    const events = await ClickEvent.find({ slug }).lean();
    expect(events).toHaveLength(1);
    expect(events[0].channel).toBe("whatsapp");
    expect(String(events[0].productId)).toBe(String(doc!._id));
  });

  it("still succeeds when the event insert fails (never regress the click)", async () => {
    const doc = await createProductDB({ ...base, name: "ClickEvt B", slug: "clickevt-b" });
    const slug = doc!.slug;
    vi.spyOn(ClickEvent, "create").mockRejectedValueOnce(new Error("boom"));

    expect(await incrementClick({ slug, channel: "instagram" })).toBe(true);

    // Counter still moved; no event stored for this click.
    expect(await ClickEvent.countDocuments({ slug })).toBe(0);
  });

  it("returns false for an unknown slug and stores no event", async () => {
    expect(await incrementClick({ slug: "nope-missing", channel: "whatsapp" })).toBe(false);
    expect(await ClickEvent.countDocuments({ slug: "nope-missing" })).toBe(0);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm test -- src/server/services/products/incrementClickEvents.test.ts`
Expected: FAIL (service does not yet write an event, so the first test's `toHaveLength(1)` fails).

- [ ] **Step 7: Update the service to write the event best-effort**

Replace `src/server/services/products/incrementClick.ts` with:

```ts
import type { TClickChannel } from "@/server/validators/types";
import { redisDeleteKeys } from "../../databases/redis";
import { getLogger } from "../../lib/logger";
import { insertClickEventDB } from "../../models/clickEvents";
import { incrementClickDB } from "../../models/products";
import { getQueryKey as bySlugKey } from "./getProductBySlug";

export default async function incrementClick({
  slug,
  channel,
}: {
  slug: string;
  channel: TClickChannel;
}): Promise<boolean> {
  const productId = await incrementClickDB({ slug, channel });
  if (!productId) return false;

  // Best-effort append for time-series analytics. A failure here MUST NOT fail the click
  // (never regress the WhatsApp/Instagram handoff) — the fast counter above already moved.
  try {
    await insertClickEventDB({ productId, slug, channel });
  } catch (err) {
    getLogger().warn({ err, slug, channel }, "click-event insert failed (click still recorded)");
  }

  await redisDeleteKeys(bySlugKey({ slug })); // refresh admin view; list cache untouched
  return true;
}
```

- [ ] **Step 8: Run the service test to verify it passes**

Run: `pnpm test -- src/server/services/products/incrementClickEvents.test.ts`
Expected: PASS.

- [ ] **Step 9: Run the full existing service suite to confirm no regression**

Run: `pnpm test -- src/server/services/products/services.test.ts`
Expected: PASS (the `incrementClick` counter test there still holds — service return type is unchanged).

- [ ] **Step 10: Commit**

```bash
git add src/server/models/products/index.ts src/server/models/products/products.test.ts src/server/services/products/incrementClick.ts src/server/services/products/incrementClickEvents.test.ts
git commit -m "feat(analytics): record a timestamped click event on each click"
```

---

## Task 5: Analytics endpoint

**Files:**
- Create: `src/app/api/admin/analytics/clicks/route.ts`

**Interfaces:**
- Consumes: `withApiHandler`, `requirePermission`, `ok`, `services` from `@/server`; `Permission` from `@/server/validators/iam`.
- Produces: `GET /api/admin/analytics/clicks?days=<n>` → `ok(IClickTrends)`, gated on `Permission.AnalyticsRead`.

- [ ] **Step 1: Create the route handler**

Create `src/app/api/admin/analytics/clicks/route.ts`. (App-router handlers are integration-tested by Playwright, per `vitest.config.ts`; the e2e guard test is Task 12.)

```ts
export const runtime = "nodejs";

import { ok, requirePermission, services, withApiHandler } from "@/server";
import { Permission } from "@/server/validators/iam";

export const GET = withApiHandler({ route: "/api/admin/analytics/clicks" }, async (req) => {
  await requirePermission(Permission.AnalyticsRead);
  const raw = new URL(req.url).searchParams.get("days");
  const days = raw ? Number(raw) : undefined;
  // clickTrends clamps any out-of-range/NaN window to the 30-day default.
  return ok(await services.analytics.clickTrends({ days }));
});
```

- [ ] **Step 2: Type-check**

Run: `pnpm ts.check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/analytics/clicks/route.ts
git commit -m "feat(analytics): GET /api/admin/analytics/clicks endpoint (AnalyticsRead)"
```

---

## Task 6: Seed synthetic click events

**Files:**
- Modify: `scripts/seed.ts`

**Interfaces:**
- Consumes: `models.clickEvents.ClickEvent`, `models.products.Product`, `generateSlug` (already imported).
- Produces: after products are (re)created, a spread of synthetic events across the retention window so the dev chart is non-empty. Idempotent: clears the demo slugs' events before inserting.

- [ ] **Step 1: Add a backfill helper near the top of `scripts/seed.ts`**

Insert after the `reuseLocalImage` function (around line 119), before `const DEMO`:

```ts
// Dev-only: fabricate a plausible click history so the admin trend chart isn't empty on a
// fresh seed. NOT real analytics — real trends accrue from first deploy. Spread across the
// last ~90 days, weighted toward recent days, WhatsApp heavier than Instagram.
function syntheticClickEvents(
  productId: string,
  slug: string,
): { productId: string; slug: string; channel: "whatsapp" | "instagram"; createdAt: Date }[] {
  const out: { productId: string; slug: string; channel: "whatsapp" | "instagram"; createdAt: Date }[] = [];
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  for (let d = 0; d < 90; d++) {
    // Recent days get more traffic (linear decay from ~4 to ~0 events/day).
    const intensity = Math.max(0, 4 - Math.floor(d / 22));
    for (let k = 0; k < intensity; k++) {
      if (Math.random() > 0.6) continue; // sparse days
      const channel = Math.random() < 0.7 ? "whatsapp" : "instagram";
      const jitter = Math.floor(Math.random() * DAY);
      out.push({ productId, slug, channel, createdAt: new Date(now - d * DAY - jitter) });
    }
  }
  return out;
}
```

- [ ] **Step 2: Capture created product ids and back-fill events in `main()`**

In `scripts/seed.ts`, the product-creation loop currently discards `createProductDB`'s return value (lines ~332-363). Change it to collect ids, then insert events after the loop. Replace the `await models.products.createProductDB({ ... })` call so its result is captured:

```ts
    const createdDoc = await models.products.createProductDB({
      name: d.name,
      category: d.category,
      brand: d.brand,
      condition: d.condition,
      cosmeticGrade: d.cosmeticGrade,
      priceNaira: d.priceNaira,
      stockType: d.stockType,
      status: d.status,
      quantity: d.quantity,
      isVisible: d.isVisible,
      slug: generateSlug(d.name),
      description: null,
      images,
      specs: [...d.specs],
    });
    if (createdDoc) createdProducts.push({ id: String(createdDoc._id), slug: createdDoc.slug });
```

Declare `const createdProducts: { id: string; slug: string }[] = [];` just before the `for (const d of DEMO)` loop.

- [ ] **Step 3: Clear + insert synthetic events after the loop**

Immediately after the product-creation `for` loop closes (before the final `console.log("\nSeed complete...")`), add:

```ts
  // Reset + back-fill click events for exactly the demo slugs (idempotent re-seed).
  const demoSlugs = createdProducts.map((p) => p.slug);
  await models.clickEvents.ClickEvent.deleteMany({ slug: { $in: demoSlugs } });
  const events = createdProducts.flatMap((p) => syntheticClickEvents(p.id, p.slug));
  if (events.length) await models.clickEvents.ClickEvent.insertMany(events);
  console.log(`Seeded ${events.length} synthetic click events across ~90 days.`);
```

- [ ] **Step 4: Run the seed against local dev**

Run: `pnpm seed`
Expected: completes with "Seed complete…" and "Seeded N synthetic click events…" (N > 0). Requires local Mongo + the configured storage driver.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed.ts
git commit -m "chore(seed): back-fill synthetic click events for the dev trend chart"
```

---

## Task 7: Pure product filter/sort logic

**Files:**
- Create: `src/lib/productFilters.ts`
- Test: `src/lib/productFilters.test.ts`

**Interfaces:**
- Consumes: `IAdminProductDto`, `TCategory`, `TCondition`, `TStatus`, `TStockType` from `@/server/validators/types`.
- Produces:
  - `type TProductSort = "newest" | "price_asc" | "price_desc" | "clicks_desc" | "clicks_asc"`
  - `interface IProductFilters { q: string; category: TCategory | ""; condition: TCondition | ""; status: TStatus | ""; stockType: TStockType | ""; visibility: "" | "visible" | "hidden"; min: number | null; max: number | null; sort: TProductSort }`
  - `DEFAULT_FILTERS: IProductFilters`
  - `matchesFilters(p: IAdminProductDto, f: IProductFilters): boolean`
  - `applyProductFilters(products: IAdminProductDto[], f: IProductFilters): IAdminProductDto[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/productFilters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { IAdminProductDto } from "@/server/validators/types";
import {
  applyProductFilters,
  DEFAULT_FILTERS,
  type IProductFilters,
  matchesFilters,
} from "./productFilters";

function prod(over: Partial<IAdminProductDto>): IAdminProductDto {
  return {
    id: "1",
    slug: "s",
    name: "iPhone 13",
    category: "PHONES",
    brand: "iPhone",
    condition: "UK_USED",
    cosmeticGrade: "A",
    priceNaira: 485000,
    description: null,
    stockType: "UNIQUE_UNIT",
    status: "AVAILABLE",
    quantity: null,
    isVisible: true,
    images: [],
    specs: [],
    whatsappClickCount: 0,
    instagramClickCount: 0,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}
const f = (over: Partial<IProductFilters>): IProductFilters => ({ ...DEFAULT_FILTERS, ...over });

describe("matchesFilters", () => {
  it("passes everything with default (empty) filters", () => {
    expect(matchesFilters(prod({}), DEFAULT_FILTERS)).toBe(true);
  });
  it("text search matches name or brand, case-insensitively", () => {
    expect(matchesFilters(prod({ name: "Galaxy S21", brand: "Samsung" }), f({ q: "samsung" }))).toBe(true);
    expect(matchesFilters(prod({ name: "Galaxy S21", brand: "Samsung" }), f({ q: "pixel" }))).toBe(false);
  });
  it("facets filter by exact value", () => {
    expect(matchesFilters(prod({ category: "PHONES" }), f({ category: "LAPTOPS" }))).toBe(false);
    expect(matchesFilters(prod({ status: "SOLD" }), f({ status: "SOLD" }))).toBe(true);
    expect(matchesFilters(prod({ stockType: "UNIQUE_UNIT" }), f({ stockType: "RESTOCKABLE" }))).toBe(false);
  });
  it("visibility filter distinguishes visible/hidden", () => {
    expect(matchesFilters(prod({ isVisible: false }), f({ visibility: "hidden" }))).toBe(true);
    expect(matchesFilters(prod({ isVisible: false }), f({ visibility: "visible" }))).toBe(false);
  });
  it("price range is inclusive on both ends", () => {
    expect(matchesFilters(prod({ priceNaira: 100 }), f({ min: 100, max: 200 }))).toBe(true);
    expect(matchesFilters(prod({ priceNaira: 99 }), f({ min: 100 }))).toBe(false);
    expect(matchesFilters(prod({ priceNaira: 201 }), f({ max: 200 }))).toBe(false);
  });
});

describe("applyProductFilters", () => {
  const a = prod({ id: "a", priceNaira: 100, createdAt: "2026-01-01T00:00:00.000Z", whatsappClickCount: 1, instagramClickCount: 0 });
  const b = prod({ id: "b", priceNaira: 300, createdAt: "2026-03-01T00:00:00.000Z", whatsappClickCount: 5, instagramClickCount: 5 });
  const c = prod({ id: "c", priceNaira: 200, createdAt: "2026-02-01T00:00:00.000Z", whatsappClickCount: 0, instagramClickCount: 0 });
  const all = [a, b, c];

  it("sorts newest first by default", () => {
    expect(applyProductFilters(all, DEFAULT_FILTERS).map((p) => p.id)).toEqual(["b", "c", "a"]);
  });
  it("sorts by price ascending and descending", () => {
    expect(applyProductFilters(all, f({ sort: "price_asc" })).map((p) => p.id)).toEqual(["a", "c", "b"]);
    expect(applyProductFilters(all, f({ sort: "price_desc" })).map((p) => p.id)).toEqual(["b", "c", "a"]);
  });
  it("sorts by total clicks", () => {
    expect(applyProductFilters(all, f({ sort: "clicks_desc" })).map((p) => p.id)).toEqual(["b", "a", "c"]);
    expect(applyProductFilters(all, f({ sort: "clicks_asc" })).map((p) => p.id)).toEqual(["c", "a", "b"]);
  });
  it("filters then sorts, and does not mutate the input array", () => {
    const out = applyProductFilters(all, f({ min: 150, sort: "price_asc" }));
    expect(out.map((p) => p.id)).toEqual(["c", "b"]);
    expect(all.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test -- src/lib/productFilters.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the filters module**

Create `src/lib/productFilters.ts`:

```ts
import type {
  IAdminProductDto,
  TCategory,
  TCondition,
  TStatus,
  TStockType,
} from "@/server/validators/types";

export type TProductSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "clicks_desc"
  | "clicks_asc";

export interface IProductFilters {
  q: string;
  category: TCategory | "";
  condition: TCondition | "";
  status: TStatus | "";
  stockType: TStockType | "";
  visibility: "" | "visible" | "hidden";
  min: number | null;
  max: number | null;
  sort: TProductSort;
}

export const DEFAULT_FILTERS: IProductFilters = {
  q: "",
  category: "",
  condition: "",
  status: "",
  stockType: "",
  visibility: "",
  min: null,
  max: null,
  sort: "newest",
};

const totalClicks = (p: IAdminProductDto): number => p.whatsappClickCount + p.instagramClickCount;

export function matchesFilters(p: IAdminProductDto, f: IProductFilters): boolean {
  const q = f.q.trim().toLowerCase();
  if (q && !`${p.name} ${p.brand}`.toLowerCase().includes(q)) return false;
  if (f.category && p.category !== f.category) return false;
  if (f.condition && p.condition !== f.condition) return false;
  if (f.status && p.status !== f.status) return false;
  if (f.stockType && p.stockType !== f.stockType) return false;
  if (f.visibility === "visible" && !p.isVisible) return false;
  if (f.visibility === "hidden" && p.isVisible) return false;
  if (f.min != null && p.priceNaira < f.min) return false;
  if (f.max != null && p.priceNaira > f.max) return false;
  return true;
}

const SORTERS: Record<TProductSort, (a: IAdminProductDto, b: IAdminProductDto) => number> = {
  newest: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  price_asc: (a, b) => a.priceNaira - b.priceNaira,
  price_desc: (a, b) => b.priceNaira - a.priceNaira,
  clicks_desc: (a, b) => totalClicks(b) - totalClicks(a),
  clicks_asc: (a, b) => totalClicks(a) - totalClicks(b),
};

export function applyProductFilters(
  products: IAdminProductDto[],
  f: IProductFilters,
): IAdminProductDto[] {
  return products.filter((p) => matchesFilters(p, f)).sort(SORTERS[f.sort]);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/lib/productFilters.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/productFilters.ts src/lib/productFilters.test.ts
git commit -m "feat(admin): pure product filter/sort predicates"
```

---

## Task 8: Filter-state and trend-data hooks

**Files:**
- Create: `src/hooks/Products/useProductFilters.ts`
- Create: `src/hooks/Analytics/useClickTrends.ts`

**Interfaces:**
- Consumes: `applyProductFilters`, `DEFAULT_FILTERS`, `IProductFilters` (Task 7); `IAdminProductDto`, `IClickTrends`; `fetcher` from `@/constants/fetcher`.
- Produces:
  - `useProductFilters(products): { filters: IProductFilters; setFilter: <K extends keyof IProductFilters>(k: K, v: IProductFilters[K]) => void; reset: () => void; filtered: IAdminProductDto[]; total: number; count: number }`
  - `useClickTrends(days: number): { trends: IClickTrends | undefined; error: unknown; isLoading: boolean }`

- [ ] **Step 1: Create the filter-state hook**

Create `src/hooks/Products/useProductFilters.ts`:

```ts
"use client";
import { useMemo, useState } from "react";
import type { IAdminProductDto } from "@/server/validators/types";
import {
  applyProductFilters,
  DEFAULT_FILTERS,
  type IProductFilters,
} from "../../lib/productFilters";

export function useProductFilters(products: IAdminProductDto[]) {
  const [filters, setFilters] = useState<IProductFilters>(DEFAULT_FILTERS);

  const setFilter = <K extends keyof IProductFilters>(key: K, value: IProductFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const reset = () => setFilters(DEFAULT_FILTERS);

  const filtered = useMemo(() => applyProductFilters(products, filters), [products, filters]);

  return { filters, setFilter, reset, filtered, total: products.length, count: filtered.length };
}
```

- [ ] **Step 2: Create the trend-data hook**

Create `src/hooks/Analytics/useClickTrends.ts`:

```ts
"use client";
import useSWR from "swr";
import type { IClickTrends } from "@/server/validators/types";
import { fetcher } from "../../constants/fetcher";

export function useClickTrends(days: number) {
  const { data, error, isLoading } = useSWR<IClickTrends>(
    `/admin/analytics/clicks?days=${days}`,
    fetcher,
  );
  return { trends: data, error, isLoading };
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm ts.check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/Products/useProductFilters.ts src/hooks/Analytics/useClickTrends.ts
git commit -m "feat(admin): filter-state and click-trend data hooks"
```

---

## Task 9: CatalogToolbar

**Files:**
- Create: `src/components/CatalogToolbar/index.tsx`
- Create: `src/components/CatalogToolbar/styled.tsx`

**Interfaces:**
- Consumes: `IProductFilters`, `TProductSort` (Task 7); `CATEGORY_LABEL`, `CATEGORIES`, `CONDITION_LABEL`, `CONDITIONS` from `@/server/validators/constants`.
- Produces: `CatalogToolbar(props: { filters: IProductFilters; setFilter: <K extends keyof IProductFilters>(k: K, v: IProductFilters[K]) => void; reset: () => void; count: number; total: number }): JSX.Element`

- [ ] **Step 1: Create the styled parts**

Create `src/components/CatalogToolbar/styled.tsx`:

```tsx
import styled from "styled-components";

export const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
`;

export const Search = styled.input`
  flex: 1 1 220px;
  min-width: 180px;
  padding: 8px 12px;
  border: 1px solid rgba(20, 21, 24, 0.14);
  border-radius: 10px;
  font: 500 14px var(--font-body);
`;

export const Select = styled.select`
  padding: 8px 10px;
  border: 1px solid rgba(20, 21, 24, 0.14);
  border-radius: 10px;
  font: 500 13px var(--font-body);
  background: #fff;
`;

export const PriceInput = styled.input`
  width: 110px;
  padding: 8px 10px;
  border: 1px solid rgba(20, 21, 24, 0.14);
  border-radius: 10px;
  font: 500 13px var(--font-body);
`;

export const Reset = styled.button`
  padding: 8px 12px;
  border: 1px solid rgba(20, 21, 24, 0.14);
  border-radius: 10px;
  background: #fff;
  font: 600 13px var(--font-body);
  cursor: pointer;
`;

export const Count = styled.span`
  margin-left: auto;
  color: var(--sold);
  font: 500 13px var(--font-body);
`;
```

- [ ] **Step 2: Create the component**

Create `src/components/CatalogToolbar/index.tsx`:

```tsx
"use client";
import { CATEGORIES, CATEGORY_LABEL, CONDITION_LABEL, CONDITIONS } from "@/server/validators/constants";
import type { TStatus, TStockType } from "@/server/validators/types";
import type { IProductFilters, TProductSort } from "../../lib/productFilters";
import { Bar, Count, PriceInput, Reset, Search, Select } from "./styled";

const STATUS_OPTIONS: { value: TStatus; label: string }[] = [
  { value: "IN_STOCK", label: "In stock" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
  { value: "AVAILABLE", label: "Available" },
  { value: "SOLD", label: "Sold" },
];
const STOCK_OPTIONS: { value: TStockType; label: string }[] = [
  { value: "RESTOCKABLE", label: "Restockable" },
  { value: "UNIQUE_UNIT", label: "Unique unit" },
];
const SORT_OPTIONS: { value: TProductSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_desc", label: "Price ↓" },
  { value: "price_asc", label: "Price ↑" },
  { value: "clicks_desc", label: "Most clicks" },
  { value: "clicks_asc", label: "Fewest clicks" },
];

interface Props {
  filters: IProductFilters;
  setFilter: <K extends keyof IProductFilters>(key: K, value: IProductFilters[K]) => void;
  reset: () => void;
  count: number;
  total: number;
}

// Controlled filter bar. Owns no state — the parent lifts it via useProductFilters so the table
// (results) and this bar (controls) stay in sync. Filters scope the TABLE only (design decision).
export function CatalogToolbar({ filters, setFilter, reset, count, total }: Props) {
  const num = (v: string): number | null => (v.trim() === "" ? null : Math.max(0, Number(v) || 0));
  return (
    <Bar>
      <Search
        type="search"
        placeholder="Search name or brand…"
        value={filters.q}
        onChange={(e) => setFilter("q", e.target.value)}
      />
      <Select value={filters.category} onChange={(e) => setFilter("category", e.target.value as IProductFilters["category"])}>
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
        ))}
      </Select>
      <Select value={filters.condition} onChange={(e) => setFilter("condition", e.target.value as IProductFilters["condition"])}>
        <option value="">All conditions</option>
        {CONDITIONS.map((c) => (
          <option key={c} value={c}>{CONDITION_LABEL[c]}</option>
        ))}
      </Select>
      <Select value={filters.status} onChange={(e) => setFilter("status", e.target.value as IProductFilters["status"])}>
        <option value="">Any status</option>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
      <Select value={filters.stockType} onChange={(e) => setFilter("stockType", e.target.value as IProductFilters["stockType"])}>
        <option value="">Any stock type</option>
        {STOCK_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
      <Select value={filters.visibility} onChange={(e) => setFilter("visibility", e.target.value as IProductFilters["visibility"])}>
        <option value="">Any visibility</option>
        <option value="visible">Visible</option>
        <option value="hidden">Hidden</option>
      </Select>
      <PriceInput
        type="number"
        min={0}
        placeholder="Min ₦"
        value={filters.min ?? ""}
        onChange={(e) => setFilter("min", num(e.target.value))}
      />
      <PriceInput
        type="number"
        min={0}
        placeholder="Max ₦"
        value={filters.max ?? ""}
        onChange={(e) => setFilter("max", num(e.target.value))}
      />
      <Select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value as TProductSort)}>
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
      <Reset type="button" onClick={reset}>Reset</Reset>
      <Count>{count} of {total} listings</Count>
    </Bar>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm ts.check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/CatalogToolbar
git commit -m "feat(admin): CatalogToolbar filter controls"
```

---

## Task 10: AdminTable — props-driven, richer columns, expandable rows

**Files:**
- Modify: `src/components/AdminTable/index.tsx` (full rewrite)
- Modify: `src/components/AdminTable/styled.tsx` (add styles)
- Reference: `src/components/AdminTable/styled.tsx` (existing exports reused: `ClicksTd, EditLink, ErrorText, MutedText, NameTd, PriceTd, Row, StatusPill, SubText, Table, TableScroll, Td, Th, ThumbBox, VisibilityPill`)

**Interfaces:**
- Consumes: `IAdminProductDto`, `TStatus` from `@/server/validators/types`; `CATEGORY_LABEL`, `CONDITION_LABEL`; `formatNaira`; `adminApi`; `routes`; SWR `mutate` passed from parent.
- Produces: `AdminTable(props: { products: IAdminProductDto[]; total: number; count: number; isLoading: boolean; error: unknown; mutate: () => Promise<unknown> }): JSX.Element` — `products` is the already-filtered list.

- [ ] **Step 1: Add new styled parts**

Append to `src/components/AdminTable/styled.tsx`:

```tsx
export const ExpandBtn = styled.button`
  width: 22px;
  height: 22px;
  border: 1px solid rgba(20, 21, 24, 0.14);
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font: 700 12px var(--font-body);
  line-height: 1;
`;

export const DetailRow = styled.tr`
  background: rgba(20, 21, 24, 0.02);
`;

export const DetailCell = styled.td`
  padding: 12px 16px 18px;
`;

export const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
`;

export const DetailBlock = styled.div`
  h4 {
    margin: 0 0 6px;
    font: 700 12px var(--font-body);
    color: var(--sold);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  ul { margin: 0; padding-left: 16px; }
  p { margin: 0; font: 500 13px var(--font-body); color: var(--ink); }
`;
```

- [ ] **Step 2: Rewrite the component**

Replace `src/components/AdminTable/index.tsx` with:

```tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import { CATEGORY_LABEL, CONDITION_LABEL } from "@/server/validators/constants";
import type { IAdminProductDto, TStatus } from "@/server/validators/types";
import { routes } from "../../constants/routes";
import { formatNaira } from "../../helpers/format";
import { adminApi } from "../../lib/adminApi";
import {
  ClicksTd,
  DetailBlock,
  DetailCell,
  DetailGrid,
  DetailRow,
  EditLink,
  ErrorText,
  ExpandBtn,
  MutedText,
  NameTd,
  PriceTd,
  Row,
  StatusPill,
  SubText,
  Table,
  TableScroll,
  Td,
  Th,
  ThumbBox,
  VisibilityPill,
} from "./styled";

//  RESTOCKABLE:  IN_STOCK ⇄ OUT_OF_STOCK      UNIQUE_UNIT:  AVAILABLE ⇄ SOLD
function nextStatus(p: IAdminProductDto): TStatus {
  if (p.stockType === "RESTOCKABLE") return p.status === "IN_STOCK" ? "OUT_OF_STOCK" : "IN_STOCK";
  return p.status === "AVAILABLE" ? "SOLD" : "AVAILABLE";
}

const STATUS_LABEL: Record<TStatus, string> = {
  IN_STOCK: "In stock",
  OUT_OF_STOCK: "Out of stock",
  AVAILABLE: "Available",
  SOLD: "Sold",
};
const STOCK_LABEL = { RESTOCKABLE: "Restockable", UNIQUE_UNIT: "Unique" } as const;

const isPositive = (s: TStatus): boolean => s === "IN_STOCK" || s === "AVAILABLE";

// Compact date + relative age, e.g. "1 Jul 2026 · 8d".
function formatAdded(iso: string): string {
  const d = new Date(iso);
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
  const age = days === 0 ? "today" : days < 30 ? `${days}d` : `${Math.floor(days / 30)}mo`;
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · ${age}`;
}

const HEADERS = ["", "Name", "Category", "Condition", "Price", "Stock", "Qty", "Status", "Visible", "Clicks", "Added", ""];

interface Props {
  products: IAdminProductDto[];
  total: number;
  count: number;
  isLoading: boolean;
  error: unknown;
  mutate: () => Promise<unknown>;
}

export function AdminTable({ products, total, count, isLoading, error, mutate }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await fn();
      await mutate();
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) return <MutedText>Loading…</MutedText>;
  if (error) return <ErrorText>Failed to load products.</ErrorText>;
  if (total === 0) {
    return (
      <MutedText>
        No products yet. <Link href={routes.adminNew}>Create your first listing →</Link>
      </MutedText>
    );
  }
  if (count === 0) {
    return <MutedText>No listings match your filters. Try clearing them.</MutedText>;
  }

  return (
    <TableScroll>
      <Table>
        <thead>
          <tr>
            {HEADERS.map((h, i) => (
              <Th key={i}>{h}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const busy = busyId === p.id;
            const open = openId === p.id;
            const thumb = p.images[0]?.url;
            return (
              <>
                <Row key={p.id} $busy={busy}>
                  <Td>
                    <ExpandBtn
                      type="button"
                      aria-label={open ? "Collapse" : "Expand"}
                      onClick={() => setOpenId(open ? null : p.id)}
                    >
                      {open ? "−" : "+"}
                    </ExpandBtn>
                  </Td>
                  <NameTd>
                    {p.name}
                    <SubText>
                      {p.brand}
                      {p.cosmeticGrade ? ` · Grade ${p.cosmeticGrade}` : ""}
                    </SubText>
                  </NameTd>
                  <Td>{CATEGORY_LABEL[p.category]}</Td>
                  <Td>{CONDITION_LABEL[p.condition]}</Td>
                  <PriceTd>{formatNaira(p.priceNaira)}</PriceTd>
                  <Td>{STOCK_LABEL[p.stockType]}</Td>
                  <Td>{typeof p.quantity === "number" ? p.quantity : "—"}</Td>
                  <Td>
                    <StatusPill
                      type="button"
                      disabled={busy}
                      onClick={() => run(p.id, () => adminApi.setStatus(p.id, nextStatus(p)))}
                      title={`Set to ${STATUS_LABEL[nextStatus(p)]}`}
                      $positive={isPositive(p.status)}
                    >
                      {STATUS_LABEL[p.status]}
                      {typeof p.quantity === "number" ? ` (${p.quantity})` : ""}
                    </StatusPill>
                  </Td>
                  <Td>
                    <VisibilityPill
                      type="button"
                      disabled={busy}
                      onClick={() => run(p.id, () => adminApi.setVisibility(p.id, !p.isVisible))}
                      $visible={p.isVisible}
                    >
                      {p.isVisible ? "Visible" : "Hidden"}
                    </VisibilityPill>
                  </Td>
                  <ClicksTd>
                    {p.whatsappClickCount}wa · {p.instagramClickCount}ig
                  </ClicksTd>
                  <Td>{formatAdded(p.createdAt)}</Td>
                  <Td>
                    <EditLink href={routes.adminEdit(p.id)}>Edit</EditLink>
                  </Td>
                </Row>
                {open && (
                  <DetailRow key={`${p.id}-detail`}>
                    <DetailCell colSpan={HEADERS.length}>
                      <DetailGrid>
                        <DetailBlock>
                          <h4>Specs</h4>
                          {p.specs.length ? (
                            <ul>
                              {p.specs.map((s, i) => (
                                <li key={i}>{s.label}: {s.value}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>No specs listed.</p>
                          )}
                        </DetailBlock>
                        <DetailBlock>
                          <h4>Description</h4>
                          <p>{p.description?.trim() ? p.description : "No description."}</p>
                        </DetailBlock>
                        <DetailBlock>
                          <h4>Media</h4>
                          <p>{p.images.length} image{p.images.length === 1 ? "" : "s"}</p>
                        </DetailBlock>
                        <DetailBlock>
                          <h4>Timeline</h4>
                          <p>Added {formatAdded(p.createdAt)}</p>
                          <p>Updated {formatAdded(p.updatedAt)}</p>
                        </DetailBlock>
                      </DetailGrid>
                    </DetailCell>
                  </DetailRow>
                )}
              </>
            );
          })}
        </tbody>
      </Table>
    </TableScroll>
  );
}
```

Note: the `<>...</>` fragment with `key` on children is valid; if Biome flags the fragment key, wrap each iteration's return in an explicit array `[<Row .../>, open && <DetailRow .../>]` instead — but the fragment form is accepted by React 19.

- [ ] **Step 3: Type-check**

Run: `pnpm ts.check`
Expected: no errors. (`AdminTable` now requires props; the parent wiring in Task 13 satisfies this. If checked in isolation before Task 13, `AdminWrapper` still references the old prop-less call and will error — that is expected until Task 13. Proceed; Task 13 fixes it.)

- [ ] **Step 4: Commit**

```bash
git add src/components/AdminTable
git commit -m "feat(admin): richer, props-driven product table with expandable detail"
```

---

## Task 11: AdminStats — inventory value, low stock, hidden

**Files:**
- Modify: `src/components/AdminStats/index.tsx`

**Interfaces:**
- Consumes: `useAdminProducts`; `formatNaira`; existing styled parts (`StatCard, StatLabel, StatValue, Strip`).
- Produces: unchanged component signature `AdminStats()`. Adds three cards computed catalog-wide.

- [ ] **Step 1: Rewrite the component**

Replace `src/components/AdminStats/index.tsx` with:

```tsx
"use client";
import { formatNaira } from "../../helpers/format";
import { useAdminProducts } from "../../hooks/Products/useAdminProducts";
import { StatCard, StatLabel, StatValue, Strip } from "./styled";

// Listings with RESTOCKABLE quantity at/under this are surfaced as "Low stock".
const LOW_STOCK_THRESHOLD = 3;

// Catalog-wide analytics summary: totals across ALL listings, derived from the admin product
// list (no extra endpoint). Stays catalog-wide even when the table is filtered (design decision).
export function AdminStats() {
  const { products, isLoading } = useAdminProducts();
  if (isLoading || products.length === 0) return null;

  const live = products.filter(
    (p) => p.isVisible && p.status !== "SOLD" && p.status !== "OUT_OF_STOCK",
  );
  const sold = products.filter((p) => p.status === "SOLD");
  const wa = products.reduce((n, p) => n + p.whatsappClickCount, 0);
  const ig = products.reduce((n, p) => n + p.instagramClickCount, 0);

  // Inventory value = Σ priceNaira × quantity over stock that is not SOLD. UNIQUE_UNIT items
  // have quantity null → treated as 1 unit unless SOLD (then 0).
  const inventoryValue = products.reduce((sum, p) => {
    if (p.status === "SOLD") return sum;
    const qty = typeof p.quantity === "number" ? p.quantity : 1;
    return sum + p.priceNaira * qty;
  }, 0);

  const lowStock = products.filter(
    (p) => p.stockType === "RESTOCKABLE" && typeof p.quantity === "number" && p.quantity <= LOW_STOCK_THRESHOLD,
  );
  const hidden = products.filter((p) => !p.isVisible);

  const cards: { label: string; value: string; accent?: string }[] = [
    { label: "Listings", value: String(products.length) },
    { label: "Live", value: String(live.length), accent: "var(--brand)" },
    { label: "Sold", value: String(sold.length), accent: "var(--sold)" },
    { label: "Inventory value", value: formatNaira(inventoryValue) },
    { label: "Low stock", value: String(lowStock.length), accent: lowStock.length ? "var(--sold)" : undefined },
    { label: "Hidden", value: String(hidden.length) },
    { label: "WhatsApp clicks", value: String(wa), accent: "var(--whatsapp)" },
    { label: "Instagram clicks", value: String(ig) },
  ];

  return (
    <Strip>
      {cards.map((c) => (
        <StatCard key={c.label}>
          <StatValue className="price" $accent={c.accent}>
            {c.value}
          </StatValue>
          <StatLabel>{c.label}</StatLabel>
        </StatCard>
      ))}
    </Strip>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm ts.check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AdminStats/index.tsx
git commit -m "feat(admin): inventory value, low-stock, and hidden stat cards"
```

---

## Task 12: AdminAnalytics — trend chart, breakdown, top listings, alerts

**Files:**
- Create: `src/components/AdminAnalytics/index.tsx`
- Create: `src/components/AdminAnalytics/styled.tsx`

**Interfaces:**
- Consumes: `useAdminProducts`; `useClickTrends` (Task 8); `IClickTrends`, `ITrendPoint`, `IAdminProductDto`; `CATEGORY_LABEL`; `formatNaira`.
- Produces: `AdminAnalytics(): JSX.Element` — catalog-wide analytics section. Self-fetches (SWR dedups with the table's fetch).

- [ ] **Step 1: Create the styled parts**

Create `src/components/AdminAnalytics/styled.tsx`:

```tsx
import styled from "styled-components";

export const Section = styled.section`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 24px;
  @media (min-width: 900px) {
    grid-template-columns: 3fr 2fr;
  }
`;

export const Card = styled.div`
  background: #fff;
  border: 1px solid rgba(20, 21, 24, 0.1);
  border-radius: 12px;
  padding: 16px;
`;

export const CardHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  h3 { margin: 0; font: 700 14px var(--font-body); color: var(--ink); }
`;

export const RangeTabs = styled.div`
  display: inline-flex;
  gap: 4px;
  button {
    border: 1px solid rgba(20, 21, 24, 0.14);
    background: #fff;
    border-radius: 8px;
    padding: 4px 10px;
    font: 600 12px var(--font-body);
    cursor: pointer;
  }
  button[data-active="true"] {
    background: var(--ink);
    color: #fff;
    border-color: var(--ink);
  }
`;

export const Legend = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font: 500 12px var(--font-body);
  color: var(--sold);
  span { display: inline-flex; align-items: center; gap: 6px; }
  i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
`;

export const Muted = styled.p`
  color: var(--sold);
  font: 500 13px var(--font-body);
  margin: 0;
`;

export const BarRow = styled.div`
  display: grid;
  grid-template-columns: 96px 1fr 36px;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font: 500 12px var(--font-body);
  .track { background: rgba(20, 21, 24, 0.08); border-radius: 6px; height: 10px; overflow: hidden; }
  .fill { height: 100%; background: var(--brand); border-radius: 6px; }
  .n { text-align: right; color: var(--sold); }
`;

export const LeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(20, 21, 24, 0.06);
  font: 500 13px var(--font-body);
  &:last-child { border-bottom: none; }
  .clicks { color: var(--sold); white-space: nowrap; }
`;

export const Chip = styled.span<{ $tone: "warn" | "info" | "bad" }>`
  display: inline-block;
  margin: 0 6px 6px 0;
  padding: 4px 10px;
  border-radius: 999px;
  font: 600 12px var(--font-body);
  background: ${(p) => (p.$tone === "bad" ? "rgba(220,38,38,0.1)" : p.$tone === "warn" ? "rgba(217,119,6,0.12)" : "rgba(20,21,24,0.06)")};
  color: ${(p) => (p.$tone === "bad" ? "#b91c1c" : p.$tone === "warn" ? "#b45309" : "var(--ink)")};
`;
```

- [ ] **Step 2: Create the component (with an inline SVG dual-area chart)**

Create `src/components/AdminAnalytics/index.tsx`:

```tsx
"use client";
import { useState } from "react";
import { CATEGORY_LABEL } from "@/server/validators/constants";
import type { IAdminProductDto, IClickTrends, ITrendPoint, TCategory } from "@/server/validators/types";
import { useClickTrends } from "../../hooks/Analytics/useClickTrends";
import { useAdminProducts } from "../../hooks/Products/useAdminProducts";
import {
  BarRow,
  Card,
  CardHead,
  Chip,
  LeaderRow,
  Legend,
  Muted,
  RangeTabs,
  Section,
} from "./styled";

const WA = "var(--whatsapp)";
const IG = "#c13584"; // Instagram magenta
const RANGES = [7, 30, 90];

// ---- Inline SVG trend chart (no chart lib). Responsive via viewBox. ----
function TrendChart({ trends }: { trends: IClickTrends }) {
  const W = 640;
  const H = 200;
  const P = 8;
  const pts = trends.series;
  const max = Math.max(1, ...pts.map((p) => Math.max(p.whatsapp, p.instagram)));
  const x = (i: number) => (pts.length <= 1 ? P : P + (i * (W - 2 * P)) / (pts.length - 1));
  const y = (v: number) => H - P - (v * (H - 2 * P)) / max;
  const line = (sel: (p: ITrendPoint) => number) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(sel(p)).toFixed(1)}`).join(" ");
  const area = (sel: (p: ITrendPoint) => number) =>
    `${line(sel)} L${x(pts.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="200" role="img" aria-label="Clicks over time">
      <path d={area((p) => p.whatsapp)} fill={WA} opacity={0.12} />
      <path d={area((p) => p.instagram)} fill={IG} opacity={0.1} />
      <path d={line((p) => p.whatsapp)} fill="none" stroke={WA} strokeWidth={2} />
      <path d={line((p) => p.instagram)} fill="none" stroke={IG} strokeWidth={2} />
    </svg>
  );
}

function ClicksTrend() {
  const [days, setDays] = useState(30);
  const { trends, isLoading } = useClickTrends(days);
  const empty = trends && trends.totals.whatsapp === 0 && trends.totals.instagram === 0;

  return (
    <Card>
      <CardHead>
        <h3>Clicks over time</h3>
        <RangeTabs>
          {RANGES.map((r) => (
            <button key={r} type="button" data-active={r === days} onClick={() => setDays(r)}>
              {r}d
            </button>
          ))}
        </RangeTabs>
      </CardHead>
      {isLoading || !trends ? (
        <Muted>Loading trend…</Muted>
      ) : empty ? (
        <Muted>No clicks recorded in this window yet.</Muted>
      ) : (
        <>
          <TrendChart trends={trends} />
          <Legend>
            <span><i style={{ background: WA }} /> WhatsApp ({trends.totals.whatsapp})</span>
            <span><i style={{ background: IG }} /> Instagram ({trends.totals.instagram})</span>
          </Legend>
        </>
      )}
    </Card>
  );
}

function Breakdown({ products }: { products: IAdminProductDto[] }) {
  const byCat = new Map<TCategory, number>();
  for (const p of products) byCat.set(p.category, (byCat.get(p.category) ?? 0) + 1);
  const rows = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <Card>
      <CardHead><h3>By category</h3></CardHead>
      {rows.map(([cat, n]) => (
        <BarRow key={cat}>
          <span>{CATEGORY_LABEL[cat]}</span>
          <span className="track"><span className="fill" style={{ width: `${(n / max) * 100}%` }} /></span>
          <span className="n">{n}</span>
        </BarRow>
      ))}
    </Card>
  );
}

function TopListings({ products }: { products: IAdminProductDto[] }) {
  const ranked = [...products]
    .map((p) => ({ p, clicks: p.whatsappClickCount + p.instagramClickCount }))
    .filter((r) => r.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);
  return (
    <Card>
      <CardHead><h3>Top listings</h3></CardHead>
      {ranked.length === 0 ? (
        <Muted>No clicks recorded yet.</Muted>
      ) : (
        ranked.map(({ p, clicks }) => (
          <LeaderRow key={p.id}>
            <span>{p.name}</span>
            <span className="clicks">{clicks} clicks</span>
          </LeaderRow>
        ))
      )}
    </Card>
  );
}

function Alerts({ products }: { products: IAdminProductDto[] }) {
  const THIRTY = 30 * 86_400_000;
  const stale = products.filter((p) => Date.now() - new Date(p.updatedAt).getTime() > THIRTY);
  const lowStock = products.filter(
    (p) => p.stockType === "RESTOCKABLE" && typeof p.quantity === "number" && p.quantity <= 3,
  );
  const visibleSold = products.filter((p) => p.isVisible && p.status === "SOLD");
  const none = !stale.length && !lowStock.length && !visibleSold.length;
  return (
    <Card>
      <CardHead><h3>Attention</h3></CardHead>
      {none ? (
        <Muted>Nothing needs attention. 🎉</Muted>
      ) : (
        <div>
          {visibleSold.map((p) => <Chip key={`vs-${p.id}`} $tone="bad">Sold but visible: {p.name}</Chip>)}
          {lowStock.map((p) => <Chip key={`ls-${p.id}`} $tone="warn">Low stock: {p.name} ({p.quantity})</Chip>)}
          {stale.map((p) => <Chip key={`st-${p.id}`} $tone="info">Stale &gt;30d: {p.name}</Chip>)}
        </div>
      )}
    </Card>
  );
}

// Catalog-wide analytics. Product-derived panels use the full admin list; the trend chart pulls
// from the timestamped click-event endpoint. All independent of the table's filters (by design).
export function AdminAnalytics() {
  const { products, isLoading } = useAdminProducts();
  if (isLoading || products.length === 0) return null;
  return (
    <>
      <Section>
        <ClicksTrend />
        <Breakdown products={products} />
      </Section>
      <Section>
        <TopListings products={products} />
        <Alerts products={products} />
      </Section>
    </>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm ts.check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/AdminAnalytics
git commit -m "feat(admin): analytics section — trend chart, breakdown, top listings, alerts"
```

---

## Task 13: Wire AdminWrapper — shared fetch + filter state

**Files:**
- Modify: `src/libs/AdminWrapper/index.tsx`

**Interfaces:**
- Consumes: `useAdminProducts`, `useProductFilters`, `AdminStats`, `AdminAnalytics`, `CatalogToolbar`, `AdminTable`, `PageTitle`.
- Produces: composed dashboard. Owns the single product fetch + filter state; passes `filtered` to the table and filter controls to the toolbar. Stats/analytics self-fetch (SWR dedups by key).

- [ ] **Step 1: Rewrite AdminWrapper**

Replace `src/libs/AdminWrapper/index.tsx` with:

```tsx
"use client";

import { AdminAnalytics } from "@/components/AdminAnalytics";
import { AdminStats } from "@/components/AdminStats";
import { AdminTable } from "@/components/AdminTable";
import { CatalogToolbar } from "@/components/CatalogToolbar";
import { useProductFilters } from "@/hooks/Products/useProductFilters";
import { PageTitle } from "@/libs/shared/styled";
import { useAdminProducts } from "../../hooks/Products/useAdminProducts";

export default function AdminWrapper() {
  const { products, isLoading, error, mutate } = useAdminProducts();
  const { filters, setFilter, reset, filtered, total, count } = useProductFilters(products);

  return (
    <>
      <PageTitle $tight>Catalog</PageTitle>
      <AdminStats />
      <AdminAnalytics />
      <CatalogToolbar
        filters={filters}
        setFilter={setFilter}
        reset={reset}
        count={count}
        total={total}
      />
      <AdminTable
        products={filtered}
        total={total}
        count={count}
        isLoading={isLoading}
        error={error}
        mutate={mutate}
      />
    </>
  );
}
```

Note the `@/hooks/...` import alias resolves to `src/hooks/...` (same `@ → src` alias). If the project convention prefers relative imports here, both `useProductFilters` and `useAdminProducts` may use `../../hooks/...`; keep them consistent.

- [ ] **Step 2: Type-check the whole project**

Run: `pnpm ts.check`
Expected: no errors (all component prop contracts now satisfied).

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors. Fix any Biome findings (e.g., fragment keys, import order) inline.

- [ ] **Step 4: Commit**

```bash
git add src/libs/AdminWrapper/index.tsx
git commit -m "feat(admin): compose dashboard with shared fetch and filter state"
```

---

## Task 14: e2e coverage + full verification

**Files:**
- Create: `e2e/admin-analytics.spec.ts`

**Interfaces:**
- Consumes: the running app + seeded DB (Playwright config provides `E2E_API_ORIGIN` / base URL, as in `e2e/admin.spec.ts`).
- Produces: e2e assertions for the endpoint guard (unauthenticated 401/403), the analytics endpoint payload shape, and the dashboard's new UI (toolbar filters the table; analytics section renders).

- [ ] **Step 1: Write the e2e spec**

Create `e2e/admin-analytics.spec.ts` (mirrors the login + `page.request` pattern in `e2e/admin.spec.ts`):

```ts
import { type BrowserContext, expect, type Page, test } from "@playwright/test";

const API = process.env.E2E_API_ORIGIN ?? "http://localhost:3100";
const OWNER = process.env.SEED_OWNER_USERNAME ?? "owner";
const PASS = process.env.SEED_OWNER_PASSWORD ?? "password";

test.describe.configure({ mode: "serial" });

let context: BrowserContext;
let page: Page;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();
  await page.goto("/admin/login");
  await page.locator('input[autocomplete="username"]').fill(OWNER);
  await page.locator('input[autocomplete="current-password"]').fill(PASS);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
});

test.afterAll(async () => {
  await context.close();
});

test("analytics endpoint requires authentication", async ({ request }) => {
  // Unauthenticated request fixture → guarded by AnalyticsRead → not 200.
  const res = await request.get(`${API}/api/admin/analytics/clicks?days=30`);
  expect(res.ok()).toBeFalsy();
  expect([401, 403]).toContain(res.status());
});

test("authenticated analytics endpoint returns a dense 30-day series", async () => {
  const res = await page.request.get(`${API}/api/admin/analytics/clicks?days=30`);
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()).data as {
    days: number;
    series: { date: string; whatsapp: number; instagram: number }[];
    totals: { whatsapp: number; instagram: number };
  };
  expect(body.days).toBe(30);
  expect(body.series).toHaveLength(30);
  expect(body.totals).toHaveProperty("whatsapp");
});

test("dashboard shows the analytics section and toolbar filters the table", async () => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Clicks over time" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "By category" })).toBeVisible();

  // Search narrows the table to matching rows.
  const search = page.getByPlaceholder("Search name or brand…");
  await search.fill("iphone");
  await expect(page.getByText(/\d+ of \d+ listings/)).toBeVisible();
  await expect(page.getByText("Samsung Galaxy S21 128GB")).toHaveCount(0);
  await expect(page.getByText("iPhone 15 Pro Max 256GB")).toBeVisible();
});
```

- [ ] **Step 2: Run the full unit suite with coverage**

Run: `pnpm test`
Expected: all unit tests PASS and coverage stays ≥95% on statements/lines/functions/branches. If a newly-added covered file drops coverage, add the missing test case before proceeding.

- [ ] **Step 3: Run the e2e suite (requires seeded DB + running app per Playwright config)**

Run: `pnpm e2e -- admin-analytics.spec.ts`
Expected: PASS. (Run `pnpm seed` first if the DB is empty so the trend chart and rows exist.)

- [ ] **Step 4: Manual smoke (optional but recommended)**

Run: `pnpm dev`, open `http://localhost:6060/admin`. Confirm: 8 stat cards, the trend chart with a 7/30/90 toggle, breakdown/top-listings/alerts, the filter toolbar narrowing the table with a live "N of M listings" count, and expandable row detail. Then stop the dev server (do not leave the port held).

- [ ] **Step 5: Commit**

```bash
git add e2e/admin-analytics.spec.ts
git commit -m "test(admin): e2e for analytics endpoint guard and dashboard filtering"
```

---

## Self-Review

**1. Spec coverage** (spec → task):
- Click-event model + TTL + `clicksByDayDB` → Task 1.
- `clickTrends` service + pure gap-fill builder (deterministic `now`) → Tasks 2–3.
- Endpoint `GET /admin/analytics/clicks` on `AnalyticsRead` → Task 5 (guard e2e in Task 14).
- `incrementClick` writes counter + best-effort event; failure never fails the click → Task 4.
- Seed back-fill → Task 6.
- `AdminStats` inventory value / low stock / hidden → Task 11.
- `AdminAnalytics`: ClicksTrend (SVG, 7/30/90 toggle, loading/empty), Breakdown, TopListings, Alerts → Task 12.
- `CatalogToolbar` (search, facets, price range, sort) → Task 9.
- `AdminTable` (new columns, expandable detail, count + empty states, preserved toggles/state machines) → Task 10.
- `useProductFilters` with pure predicates → Tasks 7–8.
- Filters scope the table only; stats/analytics catalog-wide → Tasks 11–13 (self-fetch) + Task 13 wiring.
- Testing: aggregation on throwaway DB (Task 1), pure builder (Task 2), endpoint guard (Task 14 e2e), incrementClick counter+event+isolation (Task 4), pure filter/sort predicates (Task 7). All covered.

**2. Placeholder scan:** No TBD/TODO; every code step shows full code and every test step shows assertions and a run command with expected result.

**3. Type consistency:** `IProductFilters`/`TProductSort`/`DEFAULT_FILTERS`/`applyProductFilters`/`matchesFilters` (Task 7) are consumed unchanged in Tasks 8–10, 13. `incrementClickDB` return type change (`boolean → string | null`, Task 4) is reflected in the model test update (Task 4 Step 1) and the service (Task 4 Step 7); the service still returns `boolean`, matching the existing `services.test.ts` expectations. `IClickTrends`/`ITrendPoint`/`IClickDayRow` are defined once in `validators/types.ts` (Task 1) and imported everywhere else. `insertClickEventDB`/`clicksByDayDB`/`clickTrends` names are consistent across producer and consumer tasks.

**Note on an intentional spec refinement:** the spec's model listed `productId` **and** `slug`; both are kept. To populate `productId` without an extra round-trip on the hot click path, `incrementClickDB` now returns the id from its existing atomic update (semantics of the `$inc` are unchanged). This is the one deviation from "return type unchanged" and is deliberate.
