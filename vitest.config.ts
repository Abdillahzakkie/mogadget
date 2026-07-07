import { defineConfig } from "vitest/config";

// Root config holds shared coverage settings; vitest.workspace.ts defines the projects.
// Coverage targets the logic-bearing TypeScript. React components (*.tsx) and Next.js
// route/page modules under app/ are integration-tested by the Playwright e2e suite, so they
// are excluded from the *unit* coverage metric rather than faked with shallow render tests.
export default defineConfig({
  test: {
    // DB-backed suites share one Mongo + Redis; run files serially so per-file teardown
    // (deleteMany / key cleanup) can't race a sibling file mid-assertion.
    fileParallelism: false,
    coverage: {
      thresholds: { statements: 95, lines: 95, functions: 95, branches: 95 },
      provider: "v8",
      all: true,
      include: [
        "packages/core/src/**/*.ts",
        "packages/contracts/src/**/*.ts",
        "services/api/src/**/*.ts",
        "apps/web/src/helpers/**/*.ts",
        "apps/web/src/lib/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        "**/index.ts",
        "**/types.ts",
        "**/scripts/**",
        "**/*.tsx",
        // Re-export shim (barrel-like), no logic.
        "**/models/utils.ts",
        // HTTP transport + runtime surface: the Hono host, its route handlers, the
        // request→envelope adapter, the manifest, the audit wrapper and the boot sequence
        // are exercised end-to-end by the Playwright e2e suite against the live API + Mongo +
        // Redis (see apps/web/e2e). They are integration-tested, not unit-tested, so they are
        // excluded from the *unit* coverage metric rather than covered with mock theater.
        "services/api/src/app.ts",
        "services/api/src/lib/adapter.ts",
        "services/api/src/routes/manifest.ts",
        "services/api/src/routes/auth.ts",
        "services/api/src/routes/**/route.ts",
        "packages/core/src/runtime/**",
        "packages/core/src/middleware/withAudit.ts",
      ],
      reporter: ["text", "text-summary"],
    },
  },
});
