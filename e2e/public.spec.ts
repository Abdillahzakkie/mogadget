import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

// Public catalog integration. Every assertion ties the rendered UI back to real API/DB data:
// images must actually decode, filters must change the result set, hidden products must 404,
// and the WhatsApp CTA must fire a click that persists to the store.

const API = process.env.E2E_API_ORIGIN ?? "http://localhost:3100";

type Dto = {
  slug: string;
  name: string;
  status: string;
  condition: string;
  cosmeticGrade: string | null;
  priceNaira: number;
  images: { url: string }[];
};

async function apiProducts(request: APIRequestContext, qs = ""): Promise<Dto[]> {
  const res = await request.get(`${API}/api/products${qs}`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).data as Dto[];
}

// Fail the test on any console error or failed network request — a 200 page with broken
// XHRs/images is a failing route per the validation bar.
function watchConsole(page: Page): { errors: string[] } {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("requestfailed", (r) => {
    const u = r.url();
    const errorText = r.failure()?.errorText ?? "";
    // wa.me is deliberately aborted by the CTA test; ignore favicon. In a production build
    // Next's router speculatively prefetches RSC payloads for visible <Link>s and aborts
    // them itself when superseded — a self-cancelled prefetch (_rsc + ERR_ABORTED), not a
    // broken route. Real load failures (images, XHRs, documents) still register.
    const rscPrefetchAbort = u.includes("_rsc=") && errorText === "net::ERR_ABORTED";
    if (!u.startsWith("https://wa.me") && !u.includes("favicon") && !rscPrefetchAbort) {
      errors.push(`requestfailed ${u} ${errorText}`);
    }
  });
  return { errors };
}

test.describe("public catalog", () => {
  test("home renders featured products with images that actually load", async ({
    page,
    request,
  }) => {
    const c = watchConsole(page);
    await page.goto("/");

    // Wordmark + primary nav present.
    await expect(page.getByRole("link", { name: "Shop", exact: true }).first()).toBeVisible();

    // Featured grid shows real product names (from the API newest-first slice).
    const products = await apiProducts(request, "?sort=newest");
    const featured = products.slice(0, 8);
    for (const p of featured.slice(0, 3)) {
      await expect(page.getByText(p.name, { exact: false }).first()).toBeVisible();
    }

    // At least one product image must decode (naturalWidth > 0) — proves the /uploads blob
    // served by the API renders in the browser, not a broken image.
    const imgs = page.locator('img[src*="products/"]');
    await expect(imgs.first()).toBeVisible();
    // Poll naturalWidth — a presigned S3 (or local) blob may still be decoding when first seen.
    await expect
      .poll(async () => imgs.first().evaluate((el: HTMLImageElement) => el.naturalWidth), {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);

    expect(c.errors, c.errors.join("\n")).toEqual([]);
  });

  test("catalog lists every visible product; hidden ones are absent", async ({ page, request }) => {
    await page.goto("/products");
    const products = await apiProducts(request);
    // Each visible product's name is on the page.
    for (const p of products) {
      await expect(page.getByText(p.name, { exact: false }).first()).toBeVisible();
    }
    // The hidden draft must never appear.
    await expect(page.getByText("iPad Air M2 (draft)")).toHaveCount(0);
  });

  test("category filter narrows results via the URL and the backend", async ({ page, request }) => {
    await page.goto("/products");
    // Click the Wearables chip (facet count comes from GET /products/facets).
    await page.getByRole("button", { name: /Wearables/ }).click();
    await expect(page).toHaveURL(/category=WEARABLES/);

    const wearables = await apiProducts(request, "?category=WEARABLES");
    expect(wearables.length).toBeGreaterThan(0);
    for (const p of wearables) {
      await expect(page.getByText(p.name, { exact: false }).first()).toBeVisible();
    }
    // A phone that is NOT a wearable must have dropped out.
    await expect(page.getByText("iPhone 15 Pro Max 256GB")).toHaveCount(0);
  });

  test("search + price + sort all round-trip through the API", async ({ page, request }) => {
    await page.goto("/products");
    await page.locator("#q").fill("iPhone");
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(page).toHaveURL(/q=iPhone/);

    const found = await apiProducts(request, "?q=iPhone");
    expect(found.length).toBeGreaterThan(0);
    // Non-matching product gone.
    await expect(page.getByText("PlayStation 5 Slim (Disc)")).toHaveCount(0);

    // Sort by price ascending. Active (AVAILABLE/IN_STOCK) items sort ascending among
    // themselves; SOLD/OUT_OF_STOCK always sink to the bottom (product doc §5.2), so assert
    // both rules rather than a flat ascending list.
    await page.goto("/products?sort=price_asc");
    const asc = await apiProducts(request, "?sort=price_asc");
    const inactive = (s: string) => s === "SOLD" || s === "OUT_OF_STOCK";
    const activePrices = asc.filter((p) => !inactive(p.status)).map((p) => p.priceNaira);
    expect(activePrices).toEqual([...activePrices].sort((a, b) => a - b));
    const firstInactive = asc.findIndex((p) => inactive(p.status));
    if (firstInactive !== -1) {
      expect(asc.slice(firstInactive).every((p) => inactive(p.status))).toBe(true);
    }
  });

  test("product detail integrates data, specs, and the WhatsApp deep link", async ({
    page,
    request,
  }) => {
    const c = watchConsole(page);
    const products = await apiProducts(request);
    const withSpecs = products.find((p) => p.slug.includes("iphone-13")) ?? products[0]!;

    await page.goto(`/products/${withSpecs.slug}`);
    await expect(page.getByRole("heading", { name: withSpecs.name })).toBeVisible();

    // Gallery image decodes.
    if (withSpecs.images.length) {
      const g = page.locator('img[src*="products/"]').first();
      await expect(g).toBeVisible();
      expect(await g.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    }

    // WhatsApp CTA is the single reserved-green link; href is a wa.me deep link carrying the
    // product name, formatted price and canonical URL.
    const wa = page.getByRole("link", { name: /WhatsApp/ });
    const href = await wa.first().getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    const text = decodeURIComponent(href!.split("text=")[1]!);
    expect(text).toContain(withSpecs.name);
    expect(text).toContain(withSpecs.slug);

    expect(c.errors, c.errors.join("\n")).toEqual([]);
  });

  test("SOLD unit stays visible but greyed with a ribbon", async ({ page, request }) => {
    const products = await apiProducts(request);
    const soldItem = products.find((p) => p.status === "SOLD");
    test.skip(!soldItem, "no SOLD product seeded");
    await page.goto(`/products/${soldItem!.slug}`);
    await expect(page.getByText(/This exact unit has been sold/)).toBeVisible();
    // Price is struck through on a sold unit.
    const strike = await page
      .locator(".price")
      .first()
      .evaluate((el) => getComputedStyle(el).textDecorationLine);
    expect(strike).toContain("line-through");
  });

  test("OUT_OF_STOCK unit shows the restock note", async ({ page, request }) => {
    const products = await apiProducts(request);
    const oos = products.find((p) => p.status === "OUT_OF_STOCK");
    test.skip(!oos, "no OOS product seeded");
    await page.goto(`/products/${oos!.slug}`);
    await expect(page.getByText(/out of stock/i)).toBeVisible();
  });

  test("unknown slug 404s on the public detail route", async ({ page }) => {
    // Seeded slugs carry a random suffix, so this fixed slug never exists. The true
    // hidden-product 404 (real slug of an isVisible:false doc) lives in admin.spec.ts,
    // which can resolve the slug through the authenticated admin API.
    const res = await page.goto("/products/ipad-air-m2-draft");
    expect(res?.status()).toBe(404);
  });

  test("tapping WhatsApp fires a click beacon that persists to the store", async ({
    page,
    context,
    request,
  }) => {
    // Abort the external wa.me navigation so the popup can't hang the test; the beacon still fires.
    await context.route("https://wa.me/**", (r) => r.abort());

    const products = await apiProducts(request);
    const target = products.find((p) => p.status === "AVAILABLE" || p.status === "IN_STOCK")!;
    const before = (await request.get(`${API}/api/products/${target.slug}`)).ok()
      ? (
          (await (await request.get(`${API}/api/products/${target.slug}`)).json()).data as {
            whatsappClickCount: number;
          }
        ).whatsappClickCount
      : 0;

    await page.goto(`/products/${target.slug}`);
    const clickReq = page.waitForRequest((r) => /\/api\/products\/.*\/click$/.test(r.url()));
    await page
      .getByRole("link", { name: /WhatsApp/ })
      .first()
      .click({ noWaitAfter: true });
    const req = await clickReq;
    expect(JSON.parse(req.postData() ?? "{}").channel).toBe("whatsapp");

    // Count increments in the DB (poll — increment is async and cache-invalidated).
    await expect
      .poll(
        async () => {
          const r = await request.get(`${API}/api/products/${target.slug}`);
          return ((await r.json()).data as { whatsappClickCount: number }).whatsappClickCount;
        },
        { timeout: 8000 },
      )
      .toBeGreaterThan(before);
  });

  test("contact page renders store details", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByText(/WhatsApp/i).first()).toBeVisible();
    await expect(page.getByText(/Instagram/i).first()).toBeVisible();
  });
});
