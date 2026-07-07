import { defineConfig } from "vitest/config";

// Vitest owns unit tests (src/**/*.test.ts); Playwright owns the e2e suite (e2e/*.spec.ts).
// Keeping them on disjoint globs stops vitest from trying to collect Playwright specs.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "e2e/**", ".next/**"],
  },
});
