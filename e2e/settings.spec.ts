import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { generateSync } from "otplib";

// End-to-end validation for the admin settings surface: profile, site config (incl. public-site
// integration), IAM, audit, TOTP 2FA (with the two-step login), and passkeys (via a CDP virtual
// authenticator). Integration is the bar — every write is confirmed to persist through the
// authenticated API, not just reflected in the client cache. One shared login keeps under the
// 5/15min login rate limit; the 2FA re-login is the only extra password login.

const API = process.env.E2E_API_ORIGIN ?? "http://localhost:6060";
const OWNER = process.env.SEED_OWNER_USERNAME ?? "owner";
const PASS = process.env.SEED_OWNER_PASSWORD ?? "password";

test.describe.configure({ mode: "serial" });

let context: BrowserContext;
let page: Page;

async function login(p: Page) {
  await p.goto("/admin/login");
  await p.locator('input[autocomplete="username"]').fill(OWNER);
  await p.locator('input[autocomplete="current-password"]').fill(PASS);
  await p.getByRole("button", { name: "Sign in", exact: true }).click();
}

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();
  await login(page);
  await page.waitForURL(/\/admin$/);
});

test.afterAll(async () => {
  await context.close();
});

test("settings home lists the permitted sections", async () => {
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  for (const label of ["Site config", "Access (IAM)", "Audit log", "Analytics"]) {
    await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
  }
});

test("site config: edit persists and reflects on the public site", async () => {
  const tagline = `Validated ${Date.now()}`;
  const whatsapp = "2348060248044";

  await page.goto("/admin/settings/site");
  await expect(page.getByRole("heading", { name: "Site config" })).toBeVisible();
  const taglineInput = page.locator("input").nth(1); // business name, then tagline
  await taglineInput.fill(tagline);
  await page.getByRole("button", { name: /Save changes/ }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  // Persisted through the API (not just the SWR cache).
  const res = await page.request.get(`${API}/api/admin/site-config`);
  expect(res.ok()).toBeTruthy();
  const cfg = (await res.json()).data;
  expect(cfg.tagline).toBe(tagline);
  expect(cfg.contact.whatsapp).toBe(whatsapp);

  // Public contact page shows the live WhatsApp number from config.
  await page.goto("/contact");
  await expect(page.getByText("Chat on WhatsApp").first()).toBeVisible();
  const waHref = await page.locator(`a[href*="wa.me/${whatsapp}"]`).first().getAttribute("href");
  expect(waHref).toContain(whatsapp);
});

test("site config: maintenance toggle gates the public site", async () => {
  // Turn maintenance on via API, confirm the public site shows the maintenance screen, then off.
  const on = await page.request.patch(`${API}/api/admin/site-config`, {
    data: { patch: { toggles: { maintenanceMode: true } } },
  });
  expect(on.ok()).toBeTruthy();
  await page.goto("/");
  await expect(page.getByText(/down for maintenance/i)).toBeVisible();

  const off = await page.request.patch(`${API}/api/admin/site-config`, {
    data: { patch: { toggles: { maintenanceMode: false } } },
  });
  expect(off.ok()).toBeTruthy();
  await page.goto("/");
  await expect(page.getByText(/down for maintenance/i)).toHaveCount(0);
});

test("profile: renders the owner and persists an update", async () => {
  await page.goto("/admin/settings/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  const display = `Owner ${Date.now()}`;
  await page.getByLabel(/Display name/i).fill(display);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();

  const res = await page.request.get(`${API}/api/admin/profile`);
  expect((await res.json()).data.displayName).toBe(display);
});

test("IAM: lists built-ins and round-trips a policy", async () => {
  await page.goto("/admin/settings/iam");
  await expect(page.getByRole("heading", { name: "Access (IAM)" })).toBeVisible();
  await expect(page.getByText("owner", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Administrators", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("AdministratorAccess", { exact: false }).first()).toBeVisible();

  // Create a policy via the API and confirm it persists, then delete it.
  const created = await page.request.post(`${API}/api/admin/iam/policies`, {
    data: {
      name: `E2E_RO_${Date.now()}`,
      statements: [{ effect: "Allow", actions: ["products:read"] }],
    },
  });
  expect(created.ok()).toBeTruthy();
  const policy = (await created.json()).data;
  const list = await (await page.request.get(`${API}/api/admin/iam/policies`)).json();
  expect(list.data.some((p: { _id: string }) => p._id === policy._id)).toBe(true);
  const del = await page.request.delete(`${API}/api/admin/iam/policies/${policy._id}`);
  expect(del.ok()).toBeTruthy();

  // Managed built-ins are protected.
  const groups = await (await page.request.get(`${API}/api/admin/iam/groups`)).json();
  const admins = groups.data.find((g: { name: string }) => g.name === "Administrators");
  const protectedDel = await page.request.delete(`${API}/api/admin/iam/groups/${admins._id}`);
  expect(protectedDel.status()).toBe(409);
});

test("audit log records admin mutations", async () => {
  await page.goto("/admin/settings/audit");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  const res = await page.request.get(`${API}/api/admin/audit?action=siteConfig.update`);
  const body = (await res.json()).data;
  expect(body.total).toBeGreaterThan(0);
  expect(body.items[0].action).toBe("siteConfig.update");
});

test("TOTP 2FA: enable, re-login through the second step, then disable", async () => {
  // Enrol via the API and generate a live code with the returned secret.
  const setup = await (await page.request.post(`${API}/api/admin/security/totp/setup`)).json();
  const secret = setup.data.secret as string;
  const enable = await page.request.post(`${API}/api/admin/security/totp/enable`, {
    data: { code: generateSync({ secret }) },
  });
  expect(enable.ok()).toBeTruthy();
  expect((await enable.json()).data.recoveryCodes).toHaveLength(10);

  const status = await (await page.request.get(`${API}/api/admin/security/status`)).json();
  expect(status.data.totpEnabled).toBe(true);

  // Security screen reflects the enabled state.
  await page.goto("/admin/settings/security");
  await expect(page.getByText(/Enabled/)).toBeVisible();

  // Log out and back in — the password step now demands a second factor.
  await page.request.post(`${API}/api/admin/logout`);
  await context.clearCookies();
  await login(page);
  // The UI advances to the second-factor step instead of the dashboard. Only TOTP is enrolled
  // here (no passkey yet), so the code field is shown.
  await expect(page.getByText(/Verify it.s you/)).toBeVisible();
  await page.locator('input[autocomplete="one-time-code"]').fill(generateSync({ secret }));
  await page.getByRole("button", { name: "Verify" }).click();
  await page.waitForURL(/\/admin$/);

  // Disable again so the suite is idempotent.
  const disable = await page.request.post(`${API}/api/admin/security/totp/disable`, {
    data: { code: generateSync({ secret }) },
  });
  expect(disable.ok()).toBeTruthy();
});

test("passkeys: register and sign in with a virtual authenticator", async () => {
  const client = await context.newCDPSession(page);
  await client.send("WebAuthn.enable");
  const { authenticatorId } = await client.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  // Register a passkey through the real UI ceremony.
  await page.goto("/admin/settings/security");
  await page.getByLabel(/Passkey name/i).fill("Virtual Authenticator");
  await page.getByRole("button", { name: "Add a passkey" }).click();
  await expect(page.getByText("Passkey added.")).toBeVisible();

  const list = await (await page.request.get(`${API}/api/admin/security/passkeys`)).json();
  expect(list.data.length).toBeGreaterThan(0);
  const passkeyId = list.data[0].id;

  // Password login now requires a second factor because a passkey is registered — and the passkey
  // itself can satisfy it. Sign in with the password, then complete via the passkey.
  await page.request.post(`${API}/api/admin/logout`);
  await context.clearCookies();
  await login(page);
  await expect(page.getByText(/Verify it.s you/)).toBeVisible();
  const passkeyVerify = page.getByRole("button", { name: /Verify with a passkey/ });
  await expect(passkeyVerify).toBeVisible();
  await passkeyVerify.click();
  await page.waitForURL(/\/admin$/);
  await expect(page).toHaveURL(/\/admin$/);

  // Passwordless path still works too: sign in with the passkey alone (no password).
  await page.request.post(`${API}/api/admin/logout`);
  await context.clearCookies();
  await page.goto("/admin/login");
  await page.getByRole("button", { name: /Sign in with a passkey/ }).click();
  await page.waitForURL(/\/admin$/);
  await expect(page).toHaveURL(/\/admin$/);

  // Clean up: remove the passkey and the virtual authenticator.
  await page.request.delete(`${API}/api/admin/security/passkeys/${passkeyId}`);
  await client.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
});
