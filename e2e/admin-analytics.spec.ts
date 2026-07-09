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
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
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
