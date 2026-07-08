import { defineConfig, devices } from "@playwright/test";

// Drives the already-running app (single Next.js origin, prod build on :3100 backed by
// Mongo/Redis). Start the app first (see MOGADGET.md "validation"), then `yarn e2e`.
// baseURL is overridable via E2E_BASE_URL so the same suite can point elsewhere.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 12_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
