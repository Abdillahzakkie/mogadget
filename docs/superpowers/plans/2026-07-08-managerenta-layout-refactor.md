# Managerenta-Layout Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the mogadget Turborepo monorepo (Next.js web + standalone Hono API + core/contracts packages) into a single Next.js app with Managerenta's layout, stack, and frontend conventions — preserving every feature, route, and public URL.

**Architecture:** Three phases on branch `refactor/managerenta-layout`, each ending green (ts.check + unit + e2e) as one revertible commit. Phase 1 collapses the repo on the *current* stack (the Hono adapter's per-request duties fold into `withApiHandler`, which now returns web-standard `Response`s consumable directly by Next route handlers). Phase 2 upgrades to stack parity (Next 16.2 / React 19.2 / TS 6 / zod 4 / mongoose 9 / bcrypt / jsonwebtoken). Phase 3 rewrites the frontend to Managerenta conventions (styled-components, `libs/` wrappers, `layouts/` chrome, per-domain hooks).

**Tech Stack:** Next.js (App Router, route handlers, ISR), MongoDB/mongoose, Redis/ioredis, zod, styled-components 6, vitest, Playwright, Biome.

**Spec:** `docs/superpowers/specs/2026-07-08-managerenta-layout-refactor-design.md`

## Global Constraints

- Branch: `refactor/managerenta-layout`; master untouched until the branch merges at the very end.
- Every phase ends with: `yarn ts.check` clean, `yarn test` green with coverage thresholds ≥95% (statements/lines/functions/branches), full e2e suite green against a production build, then ONE commit.
- All features/routes/URLs preserved exactly (spec §6). The e2e suite is the behavioral contract — do not weaken any spec assertion.
- Git commit messages: NO `Co-Authored-By` trailer, ever (user global rule overrides harness default).
- Mongoose: never the deprecated `new` option on `findOneAndUpdate`/`findByIdAndUpdate` — use `returnDocument: "after" | "before"`.
- Kill every started process (next dev/start, seeds) before finishing any work session; never leave ports held.
- Phase 2 exact versions (from Managerenta's package.json): `next 16.2.6`, `react 19.2.6`, `react-dom 19.2.6`, `typescript ^6.0.3`, `zod ^4.4.3`, `mongoose ^9.6.2`, `bcrypt ^6.0.0`, `jsonwebtoken ^9.0.3`, `jose ^6.2.3` (kept for edge middleware only), `@biomejs/biome 2.4.15`, `styled-components ^6.4.1` (Phase 3).
- Import alias: `@/*` → `src/*`. No `@mogadget/*` specifier may survive Phase 1.
- Deleted concepts (spec §3): Hono + adapter, CORS layer, `/revalidate` webhook, `API_ORIGIN`, `REVALIDATE_SECRET`.
- Env kept: `MONGODB_URI`, `REDIS_URL`, `SESSION_SECRET`, `SESSION_MAX_AGE`, `SITE_URL`, `NEXT_PUBLIC_SITE_URL`, `TRUST_PROXY`, `STORAGE_DRIVER`/`LOCAL_UPLOAD_DIR`/`AWS_*`/`CDN_BASE_URL`, `SEED_OWNER_USERNAME`/`SEED_OWNER_PASSWORD`.
- E2E checkpoint procedure (identical every phase):
  1. Mongo + Redis must be running locally (`mongodb://127.0.0.1:27017/mogadget`, `redis://127.0.0.1:6379`).
  2. `yarn build`
  3. `yarn seed`
  4. Start prod server on :3100 with `SITE_URL=http://localhost:3100` (background).
  5. `E2E_BASE_URL=http://localhost:3100 E2E_API_ORIGIN=http://localhost:3100 yarn e2e`
  6. Kill the server. All specs must pass.

---

## Phase 1 — Collapse to a single Next.js app (current stack)

### Task 1: Branch + root config swap

**Files:**
- Create: branch `refactor/managerenta-layout`
- Modify: `package.json` (root — becomes the single app manifest)
- Create: `tsconfig.json` (root), `next.config.ts` (root)
- Modify: `vitest.config.ts`, `biome.json`
- Create: `playwright.config.ts` (root, from `apps/web/playwright.config.ts`)
- Delete: `turbo.json`, `vitest.workspace.ts`, `tsconfig.base.json`

**Interfaces:**
- Produces: `@/*` alias resolving to `src/*` for tsc, Next, and vitest; scripts `dev/build/start/ts.check/test/lint/format/seed/e2e`.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b refactor/managerenta-layout
```

- [ ] **Step 2: Replace root `package.json`** (single app, CURRENT stack versions — merged from the four package.json files; `hono`, `@hono/node-server`, `turbo` dropped):

```json
{
  "name": "mogadget",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "ts.check": "tsc --project tsconfig.json",
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "test": "vitest run",
    "lint": "biome check",
    "format": "biome format --write",
    "seed": "tsx scripts/seed.ts",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.700.0",
    "@aws-sdk/s3-request-presigner": "^3.700.0",
    "argon2": "^0.41.0",
    "axios": "^1.7.0",
    "ioredis": "^5.4.0",
    "jose": "^5.9.0",
    "mongoose": "^8.9.0",
    "next": "^15.1.0",
    "pino": "^9.5.0",
    "prom-client": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "swr": "^2.2.5",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.4.0",
    "@playwright/test": "^1.61.1",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitest/coverage-v8": "2.1.9",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  },
  "packageManager": "yarn@1.22.22"
}
```

Note: root `"type": "module"` is dropped (Next/tsx handle module semantics; Managerenta's root has none).

- [ ] **Step 3: Create root `tsconfig.json`** (Managerenta's shape; target kept at ES2022 because server code uses `process.hrtime.bigint()` and modern lib types — deliberate deviation from Managerenta's ES2017):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "types": ["node"],
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create root `next.config.ts`** (rewrites gone — same origin now; native/server deps external):

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: [
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
    "argon2",
    "ioredis",
    "mongoose",
    "pino",
    "prom-client",
  ],
};

export default nextConfig;
```

- [ ] **Step 5: Rewrite `vitest.config.ts`** for the collapsed tree (alias + new coverage paths; `src/app/**` stays e2e-covered, `src/middleware.ts` is edge-runtime e2e-covered):

```ts
import * as path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    fileParallelism: false,
    coverage: {
      thresholds: { statements: 95, lines: 95, functions: 95, branches: 95 },
      provider: "v8",
      all: true,
      include: ["src/server/**/*.ts", "src/lib/**/*.ts", "src/helpers/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        "**/index.ts",
        "**/types.ts",
        "**/*.tsx",
        "src/server/models/utils.ts",
        "src/server/runtime/**",
        "src/server/middleware/withAudit.ts",
      ],
      reporter: ["text", "text-summary"],
    },
  },
});
```

(Keep the existing explanatory comments from the old file above the config, updated to the new paths.)

- [ ] **Step 6: Create root `playwright.config.ts`** — copy `apps/web/playwright.config.ts` verbatim; only the stack comment changes (single app on :3100, no separate API).

- [ ] **Step 7: Update `biome.json`** — replace the `files.includes` ignore of `.turbo` with `.uploads` and `coverage`:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.0/schema.json",
  "files": { "includes": ["**", "!node_modules", "!.next", "!dist", "!.uploads", "!coverage", "!test-results"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": { "enabled": true, "rules": { "recommended": true } }
}
```

- [ ] **Step 8: Delete** `turbo.json`, `vitest.workspace.ts`, `tsconfig.base.json` (git rm). Do NOT run install yet — the tree moves land first (Task 2–3).

### Task 2: Move the file tree (git mv, history-preserving)

**Files:** (every move via `git mv`)
- `packages/core/src/*` → `src/server/*` (constants, databases, domain, lib, metrics, middleware, models, runtime, services, index.ts — tests move with modules)
- `packages/contracts/src/*` → `src/server/validators/*` (index.ts, types.ts, iam.ts, iam.test.ts, constants.ts, schemas/)
- `apps/web/src/*` → `src/*` (app/, components/, constants/, helpers/, hooks/, lib/, styles/, middleware.ts)
- `apps/web/public` → `public`; `apps/web/e2e/*.spec.ts` → `e2e/`
- `services/api/src/scripts/seed.ts` → `scripts/seed.ts`
- `services/api/src/routes/products/{dto.ts,dto.test.ts,parseSearchParams.ts,parseSearchParams.test.ts}` → `src/server/helpers/products/`
- Route logic files move in Task 4.
- Delete: `apps/web/src/app/revalidate/route.ts`, `apps/web/{package.json,tsconfig.json,next.config.mjs,vitest.config.ts,playwright.config.ts,next-env.d.ts}`, `packages/*/package.json`, `packages/*/tsconfig.json`, `services/api/package.json`, `services/api/tsconfig.json` (if present), `services/api/src/{index.ts,app.ts,lib/adapter.ts,routes/manifest.ts}`

**Interfaces:**
- Produces: `src/server/index.ts` barrel (unchanged re-exports of constants/databases/domain/lib/metrics/middleware/models/services/runtime) importable as `@/server`; validators barrel as `@/server/validators` with subpaths `@/server/validators/{types,iam,schemas,constants}`.

- [ ] **Step 1: Execute the moves** with `git mv` per the map above (create `src/server/helpers/` first). Keep `services/api/src/routes/**` in place for Task 4.

- [ ] **Step 2: Repo-wide import rewrite** (all `.ts`/`.tsx` under `src/`, `scripts/`, `e2e/`), exact string mappings, longest-first:

| From | To |
|---|---|
| `@mogadget/contracts/types` | `@/server/validators/types` |
| `@mogadget/contracts/iam` | `@/server/validators/iam` |
| `@mogadget/contracts/schemas` | `@/server/validators/schemas` |
| `@mogadget/contracts/constants` | `@/server/validators/constants` |
| `@mogadget/contracts` | `@/server/validators` |
| `@mogadget/core` | `@/server` |

Exception: `scripts/seed.ts` uses relative imports instead (`../src/server`, `../src/server/validators`) so `tsx` needs no path-alias plugin.

- [ ] **Step 3: Verify zero stragglers**

Run: `grep -r "@mogadget" src scripts e2e --include="*.ts" --include="*.tsx"`
Expected: no output. Also `ls apps packages services` → only empty dirs / files scheduled for Task 4; remove empty dirs at Task 5.

### Task 3: Fold the adapter into `withApiHandler`; header-based clientIp

**Files:**
- Modify: `src/server/lib/handler.ts` (absorbs `runRoute` duties; now returns `Response`)
- Modify: `src/server/lib/clientIp.ts` (drop `socketIp` param)
- Modify: `src/server/middleware/withRateLimit.ts` (fallback call site signature)
- Modify: `src/server/lib/revalidate.ts` (in-process `revalidateTag`)
- Modify: `src/server/lib/storage.ts` (same-origin URLs)
- Modify: `src/server/constants/environments.ts` (drop `apiOrigin`, `revalidateSecret`, `INSECURE_REVALIDATE_SECRET`)
- Modify: tests that touch these: `src/server/lib/misc.test.ts`, `src/server/middleware/middleware.test.ts`, `src/server/lib/storage.test.ts`, `src/server/lib/session.test.ts` (only if it exercises handler)

**Interfaces:**
- Produces: `withApiHandler<TCtx>(options: IHandlerOptions, handler: TBaseHandler<TCtx>): (req: Request, ctx: TCtx) => Promise<Response>` — a Next-route-handler-compatible function. `TBaseHandler` (envelope-returning) unchanged, so every existing route body compiles untouched. `clientIp(req: Request): string`.

- [ ] **Step 1: Rewrite `src/server/lib/handler.ts`**:

```ts
import { clientIp } from "./clientIp";
import { verifySession } from "./session";
import { runWithRequestContext, type IQueuedCookie } from "./requestContext";
import { env } from "../constants/environments";
import { redis, redisIncr } from "../databases/redis";
import { restResponseTimeHistogram } from "../metrics";
import { fail, handleError, type IEnvelope } from "./response";
import { ErrRateLimited } from "../constants/errors";

export type THandler = (req: Request) => Promise<IEnvelope>;
export type TBaseHandler<TCtx = unknown> = (req: Request, ctx: TCtx) => Promise<IEnvelope>;
export type TRouteHandler<TCtx = unknown> = (req: Request, ctx: TCtx) => Promise<Response>;
export interface IHandlerOptions {
  route: string;
  rateLimit?: { max: number; windowSeconds: number };
}

function readToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)mg_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]!) : null;
}

async function consume(
  ip: string,
  route: string,
  max: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const key = `rl:${route}:${ip}`;
  const count = await redisIncr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  const ttl = await redis.ttl(key);
  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    retryAfter: ttl < 0 ? windowSeconds : ttl,
  };
}

function toResponse(envelope: IEnvelope, cookies: IQueuedCookie[]): Response {
  const headers = new Headers({ "content-type": "application/json", ...(envelope.headers ?? {}) });
  // Secure in production so the session cookie is never sent over plain HTTP.
  const secure = env.isProduction ? "; Secure" : "";
  for (const ck of cookies) {
    headers.append(
      "set-cookie",
      `${ck.name}=${encodeURIComponent(ck.value)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${ck.maxAge}`,
    );
  }
  return new Response(JSON.stringify(envelope.body), { status: envelope.status, headers });
}

// The single per-request wrapper for every /api route handler. Folds in what the Hono
// adapter used to do (session verify, request-id, client-IP, queued cookies) plus the
// per-route duties (rate limit, metrics, error envelope), and emits a web Response that
// Next's route handlers return as-is.
export function withApiHandler<TCtx = unknown>(
  options: IHandlerOptions,
  handler: TBaseHandler<TCtx>,
): TRouteHandler<TCtx> {
  const max = options.rateLimit?.max ?? 100;
  const windowSeconds = options.rateLimit?.windowSeconds ?? 60;
  return async (req, ctx) => {
    const token = readToken(req);
    const session = token ? await verifySession(token) : null;
    const rctx = {
      session,
      requestId: crypto.randomUUID(),
      cookies: [] as IQueuedCookie[],
      clientIp: clientIp(req),
    };
    const start = process.hrtime.bigint();
    const envelope: IEnvelope = await runWithRequestContext(rctx, async () => {
      let response: IEnvelope;
      try {
        const rl = await consume(rctx.clientIp, options.route, max, windowSeconds);
        if (!rl.allowed) {
          response = fail(ErrRateLimited.code, `Too many requests. Try again in ${rl.retryAfter}s`);
          response.headers = { "Retry-After": String(rl.retryAfter), "X-RateLimit-Remaining": "0" };
        } else {
          response = await handler(req, ctx);
          response.headers = { ...response.headers, "X-RateLimit-Remaining": String(rl.remaining) };
        }
      } catch (err) {
        response = handleError(err);
      }
      return response;
    });
    const elapsed = Number(process.hrtime.bigint() - start) / 1e9;
    restResponseTimeHistogram.observe(
      { method: req.method, route: options.route, status_code: String(envelope.status) },
      elapsed,
    );
    // Cookies were queued by the handler inside the ALS scope, mutating this same array.
    return toResponse(envelope, rctx.cookies);
  };
}
```

- [ ] **Step 2: Rewrite `src/server/lib/clientIp.ts`** (spec §3 — header-based, TRUST_PROXY-gated; degrades to a constant when untrusted, accepted):

```ts
import { env } from "../constants/environments";

// Next route handlers expose no raw socket, so header-based resolution is all we have.
// Forwarded headers are client-controlled: honoring them unconditionally lets a caller
// rotate X-Forwarded-For to dodge per-IP rate limits. Trust them only when TRUST_PROXY=true
// — i.e. the app is reachable solely through a proxy/LB that overwrites these headers.
// With TRUST_PROXY=false the key degrades to a constant (globally-shared limits): a known,
// accepted trade-off for dev/direct exposure — production deploys behind a proxy.
export function clientIp(req: Request): string {
  if (env.trustProxy) {
    const xf = req.headers.get("x-forwarded-for");
    if (xf) return xf.split(",")[0]!.trim();
    const xr = req.headers.get("x-real-ip");
    if (xr) return xr;
  }
  return "0.0.0.0";
}
```

- [ ] **Step 3: `src/server/middleware/withRateLimit.ts`** — the fallback call `clientIp(req)` keeps compiling (signature now 1-arg); update only the comment ("adapter-resolved" → "handler-resolved").

- [ ] **Step 4: Rewrite `src/server/lib/revalidate.ts`** — in-process, fire-and-forget, safe outside a Next request (unit tests):

```ts
import { getLogger } from "./logger";

// In-process on-demand ISR revalidation: product mutations invalidate the fetch-cache tags
// used by the public pages. Layered on top of the Redis service cache (invalidated
// synchronously in the service layer). Never throws into the request path — outside a Next
// request scope (unit tests, seed) revalidateTag throws, which we swallow and log.
export function triggerRevalidate(tags: string[]): void {
  if (!tags.length) return;
  void import("next/cache")
    .then(({ revalidateTag }) => {
      for (const tag of tags) revalidateTag(tag);
    })
    .catch((err) => {
      getLogger().warn(`revalidateTag failed: ${String(err)}`);
    });
}

export const revalidateTags = {
  products: "products",
  product: (slug: string) => `product:${slug}`,
};
```

- [ ] **Step 5: `src/server/lib/storage.ts`** — same-origin URLs (spec: CORS layer removed):
  - `resolveImageUrl` local branch: `return \`/uploads/${key}\`;`
  - `signUpload` local branch: `uploadUrl: \`/api/admin/uploads/blob/${fileName}\``
  - Comment updates: "Hono's :key" → "the route's [key] segment".

- [ ] **Step 6: `src/server/constants/environments.ts`** — delete `INSECURE_REVALIDATE_SECRET`, `revalidateSecret`, `apiOrigin` lines. Everything else unchanged.

- [ ] **Step 7: Update unit tests** for the new contracts:
  - Any test invoking a `withApiHandler`-wrapped fn now gets a `Response` — assert via `res.status` and `await res.json()` (body is the old envelope's `body`).
  - `clientIp` tests: drop socket-IP expectations; assert `"0.0.0.0"` when `TRUST_PROXY` unset and header extraction when set.
  - `storage.test.ts`: expected URLs become `/uploads/...` and `/api/admin/uploads/blob/...`.
  - Add handler tests if coverage on `handler.ts` drops (token parsing from Bearer + cookie, Set-Cookie emission incl. Max-Age=0 revoke, 429 headers).

- [ ] **Step 8: Run the unit suite**

Run: `yarn install && yarn test` (Mongo+Redis up)
Expected: PASS with coverage ≥95 on all four metrics. `yarn ts.check` will still fail until Task 4 lands the app routes — that's expected mid-phase.

### Task 4: API route handlers 1:1 from the manifest

**Files:**
- Move + adapt each `services/api/src/routes/**/route.ts` → `src/app/api/**/route.ts`; split `auth.ts` into two route files. Full map (Hono path → Next file):

| Manifest entry | Next route file | Exports |
|---|---|---|
| GET `/api/products` | `src/app/api/products/route.ts` | `GET` |
| GET `/api/products/facets` | `src/app/api/products/facets/route.ts` | `GET` |
| GET `/api/products/:slug` | `src/app/api/products/[slug]/route.ts` | `GET` |
| POST `/api/products/:slug/click` | `src/app/api/products/[slug]/click/route.ts` | `POST` |
| POST `/api/admin/login` | `src/app/api/admin/login/route.ts` | `POST` (ex `LOGIN`) |
| POST `/api/admin/logout` | `src/app/api/admin/logout/route.ts` | `POST` (ex `LOGOUT`) |
| GET+POST `/api/admin/products` | `src/app/api/admin/products/route.ts` | `GET`, `POST` |
| GET+PATCH+DELETE `/api/admin/products/:id` | `src/app/api/admin/products/[id]/route.ts` | `GET`, `PATCH`, `DELETE` |
| POST `/api/admin/products/:id/status` | `src/app/api/admin/products/[id]/status/route.ts` | `POST` |
| POST `/api/admin/products/:id/visibility` | `src/app/api/admin/products/[id]/visibility/route.ts` | `POST` |
| POST `/api/admin/products/:id/images` | `src/app/api/admin/products/[id]/images/route.ts` | `POST` |
| POST `/api/admin/uploads/sign` | `src/app/api/admin/uploads/sign/route.ts` | `POST` |
| PUT `/api/admin/uploads/blob/:key` | `src/app/api/admin/uploads/blob/[key]/route.ts` | `PUT` |

- Create: `src/app/api/health/route.ts`, `src/app/api/metrics/route.ts`, `src/app/uploads/[...key]/route.ts`, `src/instrumentation.ts`
- Delete: `services/api/src/{app.ts,index.ts,lib/adapter.ts,routes/manifest.ts,routes/auth.ts}` and the now-empty `apps/ packages/ services/` trees.

**Interfaces:**
- Consumes: `withApiHandler` returning `TRouteHandler` (Task 3); `@/server` barrel (Task 2).
- Produces: the complete same-origin API surface; `bootstrap()` invoked once per server boot via instrumentation.

- [ ] **Step 1: Move the 11 route files** per the table with three mechanical edits each:
  1. Imports already rewritten to `@/server` / `@/server/validators/*` (Task 2 ran repo-wide, but these files move now — re-verify).
  2. `dto`/`parseSearchParams` imports point to `@/server/helpers/products/...`.
  3. Prepend `export const runtime = "nodejs";` as the first statement of every route file.
  The existing route bodies (`export const GET = withApiHandler(...)`) are otherwise verbatim — the wrapper's new Response return type IS the Next contract. Param routes keep their `ICtx { params: Promise<{...}> }` shapes, which match Next's route context exactly.

- [ ] **Step 2: Split `auth.ts`** — `src/app/api/admin/login/route.ts`:

```ts
export const runtime = "nodejs";
import {
  withApiHandler,
  ok,
  fail,
  validateBody,
  withRateLimit,
  signSession,
  verifyPassword,
  issueSessionCookie,
  getUserByUsernameDB,
  ErrUnauthenticated,
} from "@/server";
import { adminLoginSchema } from "@/server/validators/schemas";

export const POST = withApiHandler({ route: "/api/admin/login" }, (req) =>
  withRateLimit(
    async (r) => {
      const { username, password } = await validateBody(r, adminLoginSchema);
      const user = await getUserByUsernameDB({ username });
      if (!user || !(await verifyPassword(user.passwordHash, password))) {
        return fail(ErrUnauthenticated.code, "Invalid credentials");
      }
      const token = await signSession({ sub: String(user._id), username: user.username });
      issueSessionCookie("mg_session", token, 60 * 60 * 24 * 7);
      return ok({ username: user.username });
    },
    { scope: "login", max: 5, windowSeconds: 15 * 60 },
  )(req),
);
```

`src/app/api/admin/logout/route.ts`:

```ts
export const runtime = "nodejs";
import { withApiHandler, ok, revokeSessionCookie } from "@/server";

export const POST = withApiHandler({ route: "/api/admin/logout" }, async () => {
  revokeSessionCookie("mg_session");
  return ok({ ok: true });
});
```

- [ ] **Step 3: `src/app/api/health/route.ts`** (ex Hono `/health`, now under /api):

```ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ code: 200, message: "OK", data: { up: true } });
}
```

- [ ] **Step 4: `src/app/api/metrics/route.ts`** (Managerenta pattern; use whatever registry `src/server/metrics/index.ts` exports — if it uses the prom-client default register, import that):

```ts
export const runtime = "nodejs";
import { register } from "prom-client";

export async function GET() {
  return new Response(await register.metrics(), {
    headers: { "content-type": register.contentType },
  });
}
```

- [ ] **Step 5: `src/app/uploads/[...key]/route.ts`** (ex Hono `/uploads/*` local-driver static serve; public URLs preserved):

```ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { readLocalBlob } from "@/server";

export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const blob = await readLocalBlob(key.join("/"));
  if (!blob) {
    return NextResponse.json({ code: 404, message: "Not found", data: null }, { status: 404 });
  }
  return new Response(new Uint8Array(blob.bytes), {
    headers: {
      "content-type": blob.contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
```

- [ ] **Step 6: `src/instrumentation.ts`** (replaces `services/api/src/index.ts` boot):

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrap } = await import("@/server");
    await bootstrap();
  }
}
```

Check `src/server/runtime/bootstrap.ts` first: if `bootstrap()` binds signal handlers or anything single-process-specific, keep only the connect/init parts here.

- [ ] **Step 7: Delete** the remaining `services/` files and remove the empty `apps/`, `packages/`, `services/` directories from git.

- [ ] **Step 8: Typecheck**

Run: `yarn ts.check`
Expected: clean (frontend files still compile — Task 5 wires their runtime paths).

### Task 5: Frontend plumbing, seed, e2e for one origin

**Files:**
- Modify: `src/lib/publicApi.ts` (self-origin fetch), `src/constants/fetcher.ts` + `src/lib/adminApi.ts` + `src/lib/beacon.ts` (only if they carry an API origin — they use relative `/api` via the old rewrite, verify), `scripts/seed.ts` (relative imports; no other change), `e2e/admin.spec.ts` + `e2e/public.spec.ts` (API origin default), `.env.example`, `MOGADGET.md` (status/commands section)
- Delete: nothing new

**Interfaces:**
- Consumes: same-origin API from Task 4.
- Produces: a repo where §Global-Constraints' e2e checkpoint procedure runs end-to-end.

- [ ] **Step 1: `src/lib/publicApi.ts`** — replace the `API_ORIGIN` constant with self-origin (server-side fetch needs an absolute URL):

```ts
// Server-side reads fetch this same app over loopback (SITE_URL), tagged for on-demand ISR:
// admin mutations call revalidateTag() in-process with these same tags.
const SELF_ORIGIN = process.env.SITE_URL ?? "http://localhost:3000";
```

and use `${SELF_ORIGIN}${path}` in `apiGet`. Everything else (tags, buildProductQuery, getters) unchanged. Update `publicApi.test.ts` expectations if they pin the origin.

- [ ] **Step 2: Verify browser-side callers** (`adminApi.ts`, `beacon.ts`, `fetcher.ts`, `hooks/products/useAdminProducts.ts`) use relative `/api/...` paths — they did via the rewrite; now it's genuinely same-origin. Remove any `API_ORIGIN`/rewrite-era comments.

Run: `grep -rn "API_ORIGIN\|:4000\|REVALIDATE_SECRET" src scripts e2e .env.example`
Expected: no output (after Steps 1–4).

- [ ] **Step 3: `e2e/*.spec.ts`** — change line 7 in both files:

```ts
const API = process.env.E2E_API_ORIGIN ?? "http://localhost:3100";
```

No other spec changes — assertions are the behavioral contract.

- [ ] **Step 4: `.env.example`** — delete `API_ORIGIN` and `REVALIDATE_SECRET` entries (with their comment blocks); keep everything else; adjust any wording that references "the API service".

- [ ] **Step 5: `MOGADGET.md`** — update the run/validate commands to the single-app flow (dev on :3000; checkpoint procedure from Global Constraints). Keep it short; no restructure.

### Task 6: Phase 1 green checkpoint + commit

- [ ] **Step 1:** `yarn install` (regenerates root yarn.lock without workspaces) then `yarn ts.check` → clean.
- [ ] **Step 2:** `yarn lint` → clean (or `yarn format` then clean).
- [ ] **Step 3:** `yarn test` → all pass, coverage ≥95/95/95/95.
- [ ] **Step 4:** Full e2e checkpoint per Global Constraints (build → seed → start :3100 → e2e → kill). All specs pass.
- [ ] **Step 5:** Commit everything as ONE revertible commit:

```bash
git add -A
git commit -m "refactor: collapse monorepo into single Next.js app (managerenta layout, phase 1)

- apps/web + services/api + packages/{core,contracts} -> src/{app,server,...}
- Hono adapter folded into withApiHandler (Response-returning route wrapper)
- ISR webhook -> in-process revalidateTag; CORS layer deleted (same-origin)
- clientIp header-based behind TRUST_PROXY; API_ORIGIN/REVALIDATE_SECRET removed
- root tsconfig/vitest/playwright/biome configs; @/* alias; e2e single-origin"
```

---

## Phase 2 — Stack parity

### Task 7: Dependency bumps + config churn

**Files:**
- Modify: `package.json`, `next.config.ts` (swap `argon2`→`bcrypt` in `serverExternalPackages`), possibly `tsconfig.json` (TS 6 flags), `next-env.d.ts` (regenerated)

- [ ] **Step 1: Apply version changes** in `package.json`:
  - deps: `next 16.2.6`, `react 19.2.6`, `react-dom 19.2.6`, `zod ^4.4.3`, `mongoose ^9.6.2`, `jose ^6.2.3`, add `bcrypt ^6.0.0`, `jsonwebtoken ^9.0.3`; remove `argon2`.
  - devDeps: `typescript ^6.0.3`, `@biomejs/biome 2.4.15`, `@types/react ^19.2.14`, `@types/react-dom ^19`, add `@types/bcrypt ^6.0.0`, `@types/jsonwebtoken ^9.0.10`.
  - Keep vitest 2.1 / coverage-v8 2.1.9 / playwright as-is (not in the parity table).
- [ ] **Step 2:** `yarn install` → resolves clean.
- [ ] **Step 3:** `next.config.ts`: replace `"argon2"` with `"bcrypt"` in `serverExternalPackages`.
- [ ] **Step 4:** `yarn ts.check` — triage errors from Next 16 / React 19.2 / TS 6 / zod 4 / mongoose 9. Known hotspots to fix:
  - zod 4: `.errors` → `.issues` (check `src/server/lib/validation.ts`); `z.record(v)` → `z.record(z.string(), v)`; `required_error`/`invalid_type_error` → `{ error: ... }` or `message`; enum/nativeEnum adjustments in `src/server/validators/{schemas/*,iam.ts}`.
  - mongoose 9: type-level changes in `src/server/models/**` (ObjectId/HydratedDocument generics); no callback APIs are in use; confirm no `new:` option anywhere (`grep -rn "new: true\|new: false" src`).
  - Next 16: `params`/`searchParams` are already awaited (15.1 style) — verify every page/route still typechecks; regenerate `next-env.d.ts` via `yarn build`.

### Task 8: bcrypt + jsonwebtoken swaps

**Files:**
- Modify: `src/server/lib/password.ts`, `src/server/lib/session.ts`, `src/middleware.ts` (jose 6 — API-compatible, verify only), tests `src/server/lib/session.test.ts` + any password assertions

**Interfaces:**
- Produces: `hashPassword(pw: string): Promise<string>`, `verifyPassword(hash: string, pw: string): Promise<boolean>` (argument order preserved); `signSession(payload: ISessionPayload, maxAgeSeconds?): Promise<string>`, `verifySession(token: string): Promise<ISessionPayload | null>` — signatures identical to Phase 1, callers untouched.

- [ ] **Step 1: `src/server/lib/password.ts`**:

```ts
import bcrypt from "bcrypt";

const COST = 12;

export const hashPassword = (pw: string) => bcrypt.hash(pw, COST);
export const verifyPassword = (hash: string, pw: string) =>
  bcrypt.compare(pw, hash).catch(() => false);
```

- [ ] **Step 2: `src/server/lib/session.ts`**:

```ts
import jwt from "jsonwebtoken";
import { env } from "../constants/environments";

export interface ISessionPayload {
  sub: string;
  username: string;
  perms?: string[];
}

export async function signSession(
  payload: ISessionPayload,
  maxAgeSeconds = env.sessionMaxAgeSeconds,
): Promise<string> {
  return jwt.sign({ username: payload.username, perms: payload.perms }, env.sessionSecret, {
    algorithm: "HS256",
    subject: payload.sub,
    expiresIn: maxAgeSeconds,
  });
}

export async function verifySession(token: string): Promise<ISessionPayload | null> {
  try {
    const payload = jwt.verify(token, env.sessionSecret, {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;
    return {
      sub: String(payload.sub),
      username: String(payload.username),
      perms: payload.perms as string[] | undefined,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: `src/middleware.ts`** — stays on jose (edge runtime can't run jsonwebtoken); jose 6 keeps `jwtVerify` — confirm compile. Tokens are signed by jsonwebtoken and verified by jose in middleware: both standard HS256 JWTs, interoperable — the e2e admin login→panel redirect proves it.
- [ ] **Step 4:** Update `session.test.ts` if it asserted jose-specific claims; behavior contract (round-trip sign/verify, expiry, tamper → null) stays identical.
- [ ] **Step 5:** `yarn test` → green incl. coverage.

### Task 9: Phase 2 green checkpoint + Dependabot verification + commit

- [ ] **Step 1:** `yarn ts.check`, `yarn lint`, `yarn test` all clean.
- [ ] **Step 2:** Full e2e checkpoint per Global Constraints. Note: `yarn seed` re-runs with bcrypt, regenerating the owner hash (spec §4 — no dual-verification path needed).
- [ ] **Step 3:** Commit:

```bash
git add -A
git commit -m "refactor: stack parity with managerenta (phase 2)

next 16.2 / react 19.2 / typescript 6 / zod 4 / mongoose 9;
argon2 -> bcrypt; jose -> jsonwebtoken (jose kept for edge middleware)"
```

- [ ] **Step 4:** After the final push (Task 13), verify Dependabot: `gh api repos/:owner/:repo/dependabot/alerts --jq '[.[] | select(.state=="open")] | length'` → expect the 6 open alerts cleared (or enumerate what remains and report).

---

## Phase 3 — Frontend conventions

### Task 10: styled-components foundation

**Files:**
- Modify: `package.json` (+`styled-components ^6.4.1`, `nextjs-toploader ^3.9.17`, `react-icons ^5.6.0`), `next.config.ts` (+`compiler: { styledComponents: true }`), `src/app/layout.tsx`
- Create: `src/components/StyledComponentsRegistry/index.tsx` (copy Managerenta's verbatim), `src/styles/GlobalStyle.tsx`
- Modify: `src/styles/global.ts` → replaced by `GlobalStyle.tsx` (`createGlobalStyle` carrying the same CSS custom properties/reset); `src/styles/colors.ts` stays as the token source.

- [ ] **Step 1:** Add deps, `yarn install`.
- [ ] **Step 2:** `next.config.ts` add `compiler: { styledComponents: true }`.
- [ ] **Step 3:** Create the registry (managerenta `src/components/StyledComponentsRegistry/index.tsx`, verbatim — useServerInsertedHTML + ServerStyleSheet).
- [ ] **Step 4:** Port `src/styles/global.ts`'s CSS into `src/styles/GlobalStyle.tsx` via `createGlobalStyle`; root `src/app/layout.tsx` wraps `{children}` in `<StyledComponentsRegistry><GlobalStyle />{children}</StyledComponentsRegistry>` and drops the old global-style injection.
- [ ] **Step 5:** `yarn ts.check` + `yarn dev` smoke (home renders styled) — then kill the dev server.

### Task 11: layouts/ + components/ conversion

**Files:**
- Move: `src/components/SiteHeader/` → `src/layouts/Navbar/`, `src/components/Footer/` → `src/layouts/Footer/`, `src/components/AdminHeader/` → `src/layouts/AdminHeader/` (imports updated at call sites: `src/app/(site)/layout.tsx`, `src/app/admin/(panel)/layout.tsx`)
- Modify each remaining `src/components/<X>/index.tsx` (ProductCard, Gallery, ConditionBadge, TrustStrip, ChatCta, CatalogFilters, AdminStats, AdminTable, ProductForm): extract inline style objects into a sibling `styled.tsx` exporting styled-components; JSX structure and all text/roles/autocomplete attributes preserved byte-for-byte where e2e selects on them.

**Interfaces:**
- Produces: `src/layouts/{Navbar,Footer,AdminHeader}` (component export names unchanged: `SiteHeader` renamed export → `Navbar`; update the two layout call sites); every component dir gains `styled.tsx`, no prop contracts change.

- [ ] **Step 1:** `git mv` the three chrome components; rename `SiteHeader` component/export to `Navbar`; update imports in the two app layouts.
- [ ] **Step 2:** Convert components one at a time to `index.tsx` + `styled.tsx` (`"use client"` only where it already exists — styled-components requires client components; server-rendered pieces like Footer become client components as Managerenta does).
- [ ] **Step 3:** **E2E-critical invariants** (do not alter): ProductForm's label-div + immediately-following input/select/textarea structure and exact label texts; login inputs' `autocomplete="username"`/`"current-password"`; "Sign in" button text; AdminTable row semantics; product-card link hrefs.
- [ ] **Step 4:** After each component: `yarn ts.check`. After all: run e2e checkpoint's build+seed+start+e2e cycle once (catches selector drift early), kill server.

### Task 12: libs/ page wrappers + hooks/ layout

**Files:**
- Create: `src/libs/HomeWrapper/`, `src/libs/CatalogWrapper/`, `src/libs/ProductDetailWrapper/`, `src/libs/ContactWrapper/`, `src/libs/LoginWrapper/`, `src/libs/AdminWrapper/`, `src/libs/ProductFormWrapper/` — each `{index.tsx, styled.tsx}` (+`components/` only where a page has page-private pieces)
- Modify: the seven pages `src/app/(site)/{page,products/page,products/[slug]/page,contact/page}.tsx`, `src/app/admin/login/page.tsx`, `src/app/admin/(panel)/{page,products/new/page,products/[id]/page}.tsx` to thin delegates
- Move: `src/hooks/products/useAdminProducts.ts` → `src/hooks/Products/useAdminProducts.ts` (managerenta capitalized domain dirs); update importers.

**Interfaces:**
- Produces: each wrapper is `"use client"` (except Home/Catalog/ProductDetail/Contact wrappers, which stay server-compatible presentational components since those pages are ISR server-rendered — no SWR); pages fetch data exactly as today (`publicApi` fetch-with-tags server-side) and pass DTOs down as props. Admin pages keep their client-side SWR/data flow, relocated into the wrappers.

- [ ] **Step 1:** Public pages: move each page's JSX body into `libs/XxxWrapper/index.tsx` (props = the data the page fetched; styling in `styled.tsx`); the page file keeps ONLY: data fetch via `publicApi`, metadata/`generateMetadata`, ISR exports (`revalidate`, `dynamicParams` — preserve whatever each page declares today), and `return <XxxWrapper {...data} />`.
- [ ] **Step 2:** Admin pages: same split; `"use client"` moves to the wrapper; page becomes a thin server component rendering the wrapper (login/new/edit/dashboard). `ProductFormWrapper` serves both new+edit (mode via props, as ProductForm does today).
- [ ] **Step 3:** `git mv src/hooks/products src/hooks/Products`; fix imports.
- [ ] **Step 4:** `yarn ts.check` clean; quick `yarn dev` route-by-route smoke of all 8 pages, then kill the dev server.

### Task 13: Phase 3 checkpoint, merge, push

- [ ] **Step 1:** `yarn ts.check`, `yarn lint`, `yarn test` (coverage unaffected — `*.tsx` excluded) all clean.
- [ ] **Step 2:** Full e2e checkpoint per Global Constraints — behavior pixel-for-pixel per spec §7 (visual styling may differ only where styled-components conversion requires).
- [ ] **Step 3:** Commit:

```bash
git add -A
git commit -m "refactor: managerenta frontend conventions (phase 3)

styled-components + registry; libs/ page wrappers; layouts/ chrome
(Navbar/Footer/AdminHeader); hooks/Products; inline styles removed"
```

- [ ] **Step 4:** Merge + push (spec §7 rollback story — master untouched until now):

```bash
git checkout master
git merge --no-ff refactor/managerenta-layout -m "refactor: adopt managerenta layout, stack, and frontend conventions"
git push origin master refactor/managerenta-layout
```

- [ ] **Step 5:** Run the Dependabot verification from Task 9 Step 4 against the pushed master; report the result.

---

## Deviations from spec (deliberate, minor)

- `tsconfig` target ES2022 (not Managerenta's ES2017) — server code relies on modern lib types; parity is in shape (paths/include/strict), not this literal.
- `Toast` layout listed in spec §2 is omitted: mogadget has no toast feature today (YAGNI; spec §6 "all features preserved" governs — there is nothing to preserve).
- vitest/coverage-v8 versions stay at 2.1.x — not part of the spec §4 parity table.
- Public server components keep fetch-based `publicApi` (self-origin + tags) rather than converting to direct service calls: spec §5 explicitly permits this ("may keep"), and it preserves the fetch-tag ISR semantics that `revalidateTag()` targets.
