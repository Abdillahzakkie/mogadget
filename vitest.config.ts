import * as path from "node:path";
import { defineConfig } from "vitest/config";

// Coverage targets the logic-bearing TypeScript. React components (*.tsx) and Next.js
// route/page modules under src/app/ are integration-tested by the Playwright e2e suite, so
// they are excluded from the *unit* coverage metric rather than faked with shallow render
// tests.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    // Unit tests only — e2e/*.spec.ts belongs to Playwright.
    include: ["src/**/*.test.ts"],
    // DB-backed suites share one Mongo + Redis; run files serially so per-file teardown
    // (deleteMany / key cleanup) can't race a sibling file mid-assertion.
    fileParallelism: false,
    coverage: {
      thresholds: { statements: 95, lines: 95, functions: 95, branches: 95 },
      provider: "v8",
      include: ["src/server/**/*.ts", "src/lib/**/*.ts", "src/helpers/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        "**/index.ts",
        "**/types.ts",
        "**/*.tsx",
        // Re-export shim (barrel-like), no logic.
        "src/server/models/utils.ts",
        // Runtime surface (bootstrap/boot sequence) and the audit wrapper are exercised
        // end-to-end by the Playwright e2e suite against the live app + Mongo + Redis
        // (see e2e/). They are integration-tested, not unit-tested, so they are excluded
        // from the *unit* coverage metric rather than covered with mock theater.
        "src/server/runtime/**",
        "src/server/middleware/withAudit.ts",
      ],
      reporter: ["text", "text-summary"],
    },
  },
});
