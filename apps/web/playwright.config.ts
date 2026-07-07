import { defineConfig, devices } from "@playwright/test";

// Drives the already-running dev stack (web :3100 → API :4000 → Mongo/Redis). Start the stack
// first (see README "validation"), then `yarn workspace @mogadget/web e2e`. baseURL is overridable
// via E2E_BASE_URL so the same suite can point at a production `next start` build.
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
