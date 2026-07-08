import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// Admin panel integration. One UI login is shared across the suite (the login endpoint is
// rate-limited 5/15min), then every mutation is verified to persist through the authenticated
// API — not merely reflected in the client-side SWR cache.

const API = process.env.E2E_API_ORIGIN ?? "http://localhost:4000";
const OWNER = process.env.SEED_OWNER_USERNAME ?? "owner";
const PASS = process.env.SEED_OWNER_PASSWORD ?? "password";

test.describe.configure({ mode: "serial" });

let context: BrowserContext;
let page: Page;

// Field inputs in ProductForm are label-div + sibling control (no htmlFor); grab the first
// input/select/textarea that follows the exact label text.
const field = (label: string) =>
  page
    .getByText(label, { exact: true })
    .locator("xpath=following-sibling::*[self::input or self::select or self::textarea][1]");

type AdminRow = {
  id: string;
  name: string;
  priceNaira: number;
  status: string;
  isVisible: boolean;
  images: { url: string }[];
};

// Tiny valid 1×1 PNG — enough for the storage round-trip; the browser can decode it.
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
async function adminList(): Promise<AdminRow[]> {
  const res = await page.request.get(`${API}/api/admin/products`);
  expect(res.ok(), "admin list should be authorized").toBeTruthy();
  return (await res.json()).data as AdminRow[];
}
const byName = (rows: AdminRow[], name: string) => rows.find((r) => r.name === name);

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

test("unauthenticated /admin redirects to login", async ({ page: fresh }) => {
  await fresh.goto("/admin");
  await expect(fresh).toHaveURL(/\/admin\/login/);
});

test("dashboard shows seeded catalog and analytics stats", async () => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();
  const rows = await adminList();
  // Stats strip "Listings" equals the admin list length (includes hidden).
  const listingsCard = page.locator("div", { hasText: /^Listings$/ }).first();
  await expect(listingsCard).toBeVisible();
  // A couple of known seeded rows are present.
  await expect(page.getByText("iPhone 15 Pro Max 256GB")).toBeVisible();
  await expect(page.getByText("iPad Air M2 (draft)")).toBeVisible(); // hidden still listed in admin
  expect(rows.length).toBeGreaterThanOrEqual(9);
});

test("status toggle persists and restores", async () => {
  await page.goto("/admin");
  const row = page.locator("tr", { hasText: "iPhone 15 Pro Max 256GB" });
  const statusBtn = row.getByRole("button").nth(0);
  await expect(statusBtn).toContainText("In stock");
  await statusBtn.click();
  await expect(row.getByRole("button").nth(0)).toContainText("Out of stock");

  // Persisted in the store.
  await expect
    .poll(async () => byName(await adminList(), "iPhone 15 Pro Max 256GB")?.status)
    .toBe("OUT_OF_STOCK");

  // Restore.
  await row.getByRole("button").nth(0).click();
  await expect(row.getByRole("button").nth(0)).toContainText("In stock");
  await expect
    .poll(async () => byName(await adminList(), "iPhone 15 Pro Max 256GB")?.status)
    .toBe("IN_STOCK");
});

test("visibility toggle persists, hides from public catalog, and restores", async () => {
  await page.goto("/admin");
  const row = page.locator("tr", { hasText: "Apple Watch Series 8 45mm" });
  const visBtn = row.getByRole("button").nth(1);
  await expect(visBtn).toContainText("Visible");
  await visBtn.click();
  await expect(row.getByRole("button").nth(1)).toContainText("Hidden");

  await expect
    .poll(async () => byName(await adminList(), "Apple Watch Series 8 45mm")?.isVisible)
    .toBe(false);

  // Gone from the public API list.
  await expect
    .poll(async () => {
      const pub = await page.request.get(`${API}/api/products`);
      return ((await pub.json()).data as { name: string }[]).some((p) => p.name === "Apple Watch Series 8 45mm");
    })
    .toBe(false);

  // Restore.
  await row.getByRole("button").nth(1).click();
  await expect(row.getByRole("button").nth(1)).toContainText("Visible");
  await expect
    .poll(async () => byName(await adminList(), "Apple Watch Series 8 45mm")?.isVisible)
    .toBe(true);
});

test("hidden product's real slug 404s publicly while visible in admin", async ({ request }) => {
  // The admin list (authenticated) exposes the hidden draft's actual randomized slug;
  // the public page and API — hit with the UNauthenticated `request` fixture — must 404 it.
  const rows = (await (await page.request.get(`${API}/api/admin/products`)).json()).data as {
    name: string;
    slug: string;
    isVisible: boolean;
  }[];
  const hidden = rows.find((r) => !r.isVisible);
  test.skip(!hidden, "no hidden product seeded");
  expect((await request.get(`${API}/api/products/${hidden!.slug}`)).status()).toBe(404);
  expect((await request.get(`/products/${hidden!.slug}`)).status()).toBe(404);
});

test("create → edit → delete lifecycle persists at each step", async () => {
  const NAME = "E2E Validation Widget";

  // A previous aborted run may have left this widget behind (the suite has no global
  // teardown by design — each run self-heals here instead).
  for (const stale of (await adminList()).filter((r) => r.name === NAME)) {
    await page.request.delete(`${API}/api/admin/products/${stale.id}`);
  }

  // CREATE (NEW product; defaults: PHONES / NEW / IN_STOCK / qty 1), with a photo — drives
  // the full signed-upload path: POST /uploads/sign → browser PUT to uploadUrl → key on create.
  await page.goto("/admin/products/new");
  await field("Name").fill(NAME);
  await field("Brand").fill("TestBrand");
  await field("Price (₦)").fill("123456");
  await page.locator('input[type="file"]').setInputFiles({
    name: "e2e.png",
    mimeType: "image/png",
    buffer: PNG_1PX,
  });
  // The thumbnail card (with its ✕ remove button) appears only after the signed PUT
  // succeeded and the key landed in form state — the reliable "upload finished" signal.
  await expect(page.getByRole("button", { name: "✕" })).toHaveCount(1);
  await page.getByRole("button", { name: "Create listing" }).click();
  await page.waitForURL(/\/admin$/);
  await expect(page.getByText(NAME).first()).toBeVisible();

  let row = byName(await adminList(), NAME);
  expect(row, "created product persisted").toBeTruthy();
  expect(row!.priceNaira).toBe(123456);
  const id = row!.id;

  // The uploaded blob persisted and is publicly served.
  expect(row!.images.length, "uploaded image attached to the product").toBeGreaterThan(0);
  const img = await page.request.get(row!.images[0]!.url);
  expect(img.ok(), "stored image URL serves").toBeTruthy();
  expect(img.headers()["content-type"] ?? "").toContain("image/");

  // Appears on the public catalog too (create invalidates the cache).
  await expect
    .poll(async () => {
      const pub = await page.request.get(`${API}/api/products`);
      return ((await pub.json()).data as { name: string }[]).some((p) => p.name === NAME);
    })
    .toBe(true);

  // EDIT price.
  await page.goto(`/admin/products/${id}`);
  await expect(page.getByRole("heading", { name: new RegExp(`Edit — ${NAME}`) })).toBeVisible();
  await field("Price (₦)").fill("222222");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL(/\/admin$/);
  await expect.poll(async () => byName(await adminList(), NAME)?.priceNaira).toBe(222222);

  // DELETE (confirm dialog).
  page.once("dialog", (d) => d.accept());
  await page.goto(`/admin/products/${id}`);
  await page.getByRole("button", { name: "Delete" }).click();
  await page.waitForURL(/\/admin$/);
  await expect.poll(async () => byName(await adminList(), NAME)).toBeFalsy();

  // And gone from the public detail route.
  const res = await page.request.get(`${API}/api/products/${id}`);
  expect(res.status()).toBe(404);
});
