# Admin Settings, Profile & Account Security — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `/admin/settings` area with self-service profile, DB-backed site config,
passkey + TOTP 2FA auth, and admin surfaces for audit/analytics/IAM — all TDD, >95% coverage,
Playwright-verified, ending in a full-stack-validation pass.

**Architecture:** Extend the existing Model → Service → Route triad. New Mongoose models
(`siteConfig`, `webauthnCredentials`, extended `users`), new `services/*` modules, new
`/api/admin/*` route handlers behind `withApiHandler`/`withPermission`/`withRateLimit`/
`withAudit`, and new `/admin/(panel)/settings/*` pages with `SettingsWrapper` containers +
SWR hooks. Sensitive secrets encrypted at rest; Redis caches site config and WebAuthn challenges.

**Tech Stack:** Next.js 16 (App Router), Mongoose 9, ioredis, zod 4, styled-components,
jsonwebtoken/jose, bcrypt, `@simplewebauthn/server`, `otplib`, `qrcode`, Vitest, Playwright.

## Global Constraints

- Node runtime for all API routes: `export const runtime = "nodejs"`.
- All routes return `IEnvelope` via `ok()` / `fail()`; validate input with `validateBody` + zod.
- Never use Mongoose `new:` option — use `returnDocument: "after" | "before"`.
- No `Co-Authored-By` trailer on commits.
- Backing services in Docker; tests run against a throwaway DB and tear down after themselves.
- Unit coverage stays ≥95% (vitest gate).
- Reuse existing helpers: `hashPassword`/`verifyPassword`, `signSession`/`verifySession`,
  `issueSessionCookie`/`revokeSessionCookie`, `getSessionUser`, `resolveEffectivePermissions`,
  `invalidateEffectivePermissions`, `revalidate`, storage/upload pipeline, Redis client.
- New deps: `@simplewebauthn/server`, `otplib`, `qrcode`, `@types/qrcode` (dev).
- New env (with dev-safe defaults, documented in `.env.example`): `CREDENTIAL_ENCRYPTION_KEY`,
  `RP_ID`, `RP_NAME`, `WEBAUTHN_ORIGIN`.

---

## Task 0: Foundations — deps, env, crypto, permissions

**Files:**
- Modify: `package.json` (deps)
- Modify: `src/server/constants/environments.ts` (new env fields)
- Modify: `.env.example`
- Create: `src/server/lib/crypto.ts` + `src/server/lib/crypto.test.ts`
- Modify: `src/server/validators/iam.ts` (`Permission.SettingsWrite`, section map)

**Interfaces produced:**
- `encryptSecret(plain: string): string` / `decryptSecret(payload: string): string` (AES-256-GCM,
  format `v1:<iv b64>:<tag b64>:<ct b64>`), key from `env.credentialEncryptionKey`.
- `env.credentialEncryptionKey`, `env.rpId`, `env.rpName`, `env.webauthnOrigin`.
- `Permission.SettingsWrite = "settings:write"`.

**Steps:** install deps; add env fields (HKDF-derive credential key from `sessionSecret` when
unset; production boot refuses derived key when 2FA/passkey configured); write crypto round-trip
test (encrypt→decrypt equals input; tampered payload throws; two encryptions differ by IV);
implement; add `SettingsWrite` + `{ prefix: "/admin/settings", permission: SettingsWrite }` is
NOT added (settings landing is authenticated-only; sub-sections gate in-route). Commit.

---

## Task 1: Site Config module

**Files:**
- Create: `src/server/models/siteConfig/{index.ts,types.ts}`
- Create: `src/server/services/siteConfig/{index.ts,getSiteConfig.ts,updateSiteConfig.ts,*.test.ts}`
- Create: `src/server/validators/schemas/siteConfig.ts`
- Create: `src/app/api/admin/site-config/route.ts` (GET, PATCH)
- Modify: `src/server/validators/constants.ts` (keep as defaults)
- Modify: public consumers of `CONTACT`/`WHATSAPP_NUMBER` (whatsapp link builder, footer, contact)
- Create: `src/app/admin/(panel)/settings/site/page.tsx` + `src/libs/settings/SiteConfigWrapper/*`
- Create: `src/hooks/Settings/useSiteConfig.ts`

**Interfaces produced:**
- `getSiteConfig(): Promise<ISiteConfig>` (Redis-cached key `site:config`, cold fallback to
  constant defaults), `updateSiteConfig(patch): Promise<ISiteConfig>` (validate→persist→
  invalidate→revalidate public routes).
- `ISiteConfig { businessName, tagline, contact:{whatsapp,instagram,facebook,address,hours},
  seo:{defaultTitle,defaultDescription,ogImageKey?}, toggles:{maintenanceMode,showSoldListings} }`.

**Tests:** cold read returns defaults; write persists + subsequent read reflects it; cache hit
avoids DB (spy); invalidation after update; zod rejects bad whatsapp/empty businessName.
Commit after green.

---

## Task 2: Profile module

**Files:**
- Modify: `src/server/models/users/{index.ts,types.ts}` (displayName, email, avatarKey, preferences;
  `updateUserProfileDB`, `updateUserPasswordDB`, `updateUsernameDB`)
- Create: `src/server/services/profile/{index.ts,getMyProfile.ts,updateProfile.ts,changePassword.ts,*.test.ts}`
- Create: `src/server/validators/schemas/profile.ts`
- Create: `src/app/api/admin/profile/route.ts` (GET, PATCH), `.../profile/password/route.ts` (POST)
- Create: `src/app/admin/(panel)/settings/profile/page.tsx` + `src/libs/settings/ProfileWrapper/*`
- Create: `src/hooks/Settings/useProfile.ts`

**Interfaces produced:**
- `getMyProfile(userId)`, `updateProfile(userId, patch)`, `changePassword(userId, current, next)`
  (verifies current, rejects unchanged, re-hashes). Profile DTO excludes `passwordHash`/secrets.

**Tests:** update sets fields; changePassword rejects wrong current, accepts valid; username
uniqueness conflict surfaces a clean error. Commit.

---

## Task 3: Audit viewer + Analytics page

**Files:**
- Modify: `src/server/models/adminAuditLogs/index.ts` (`queryAuditLogsDB` with filters + count)
- Create: `src/server/services/audit/{index.ts,queryAuditLogs.ts,*.test.ts}`
- Create: `src/server/validators/schemas/audit.ts`
- Create: `src/app/api/admin/audit/route.ts` (GET, `AuditRead`)
- Create: `src/app/admin/(panel)/settings/audit/page.tsx` + `src/libs/settings/AuditWrapper/*`
- Create: `src/app/admin/(panel)/settings/analytics/page.tsx` + `src/libs/settings/AnalyticsWrapper/*`
- Create: `src/hooks/Settings/{useAudit.ts}`

**Interfaces produced:**
- `queryAuditLogs({action?,userId?,from?,to?,page?,limit?}): {items,total,page,limit}` with usernames resolved.

**Tests:** filter by action; date range; pagination total; empty result. Commit.

---

## Task 4: IAM management CRUD

**Files:**
- Modify: models `groups`, `policies`, `users` (list-all / create / update / delete helpers)
- Create: `src/server/services/iam/{listUsers,createUser,updateUser,deleteUser,resetPassword,
  listGroups,createGroup,updateGroup,deleteGroup,listPolicies,createPolicy,updatePolicy,deletePolicy}.ts`
  + `*.test.ts` + barrel exports
- Create: `src/server/validators/schemas/iam.ts`
- Create: routes `src/app/api/admin/iam/{users,groups,policies}/route.ts` + `.../[id]/route.ts` (`IamManage`)
- Create: `src/app/admin/(panel)/settings/iam/page.tsx` + `src/libs/settings/IamWrapper/*`
- Create: `src/hooks/Settings/useIam.ts`

**Interfaces produced:** CRUD services returning DTOs (users without `passwordHash`).
**Guards (tested):** cannot delete self last-admin; cannot delete last admin; cannot delete/rename
`managed` built-ins; policy statements validated. Mutations call `invalidateEffectivePermissions`.

**Tests:** create/update/delete each entity; guard rejections; effective-perms cache invalidated. Commit.

---

## Task 5: TOTP 2FA + login flow

**Files:**
- Create: `src/server/models/userSecurity/{index.ts,types.ts}` (or extend users) — encrypted
  `totpSecret`, `totpEnabled`, hashed `recoveryCodes`
- Create: `src/server/services/security/{totpSetup,totpEnable,totpDisable,verifyTotp,
  regenerateRecoveryCodes,consumeRecoveryCode}.ts` + `*.test.ts` + barrel
- Create: `src/server/validators/schemas/security.ts`
- Create: routes `src/app/api/admin/security/totp/{setup,enable,disable,recovery-codes}/route.ts`
- Modify: `src/app/api/admin/login/route.ts` (issue pending-2FA token when enabled)
- Create: `src/app/api/admin/login/totp/route.ts`
- Modify: `src/server/lib/session.ts` (support `stage` claim; `signPending2fa`/`verifyPending2fa`)
- Modify: LoginWrapper (second-step TOTP form), SecurityWrapper UI + `useSecurity` hook

**Interfaces produced:** `totpSetup(userId)→{otpauthUrl,qrDataUrl}`; `totpEnable(userId,code)→
{recoveryCodes}`; `verifyTotp(userId,code)→bool`; `consumeRecoveryCode(userId,code)→bool`.

**Tests:** setup→enable with a code generated from the secret; wrong code rejected; disable
requires code; recovery code single-use; login returns `mfaRequired` when enabled; `/login/totp`
issues session with valid code/recovery code. Commit.

---

## Task 6: Passkeys (WebAuthn)

**Files:**
- Create: `src/server/models/webauthnCredentials/{index.ts,types.ts}`
- Create: `src/server/services/passkeys/{registrationOptions,verifyRegistration,
  authenticationOptions,verifyAuthentication,listPasskeys,renamePasskey,deletePasskey}.ts` + tests
- Create: `src/server/lib/webauthnChallenge.ts` (Redis stash/consume, TTL 5m)
- Create: routes `src/app/api/admin/security/passkeys/*` + `src/app/api/admin/login/passkey/*`
- Modify: LoginWrapper ("Sign in with a passkey"), SecurityWrapper (passkey list/register),
  `src/lib/webauthnClient.ts` (browser ceremony helpers), `useSecurity` hook

**Interfaces produced:** options/verify services wrapping `@simplewebauthn/server`; login
verification issues full `mg_session`.

**Tests (mock `@simplewebauthn/server`):** registration stores credential; duplicate credentialId
rejected; authentication bumps counter + issues session; unknown credential rejected. Commit.

---

## Task 7: Settings shell, nav, seed, docs

**Files:**
- Create: `src/app/admin/(panel)/settings/{layout.tsx,page.tsx}` + `src/libs/settings/SettingsHome/*`
  + `src/layouts/SettingsNav/*`
- Modify: `src/layouts/AdminHeader` (Settings link), `src/constants/routes.ts`
- Modify: `scripts/seed.ts` (seed siteConfig singleton from constants)
- Modify: `MOGADGET.md` (auth-guidance note), `README.md` (settings + env)
- Modify: `src/middleware.ts` / edge proxy (reject pending-2FA token; nav gating)

**Tests:** settings pages render; nav shows only permitted sections. Commit.

---

## Task 8: Playwright e2e + full-stack-validation

**Files:**
- Create: `e2e/settings-site-config.spec.ts`, `e2e/security-2fa.spec.ts`,
  `e2e/security-passkey.spec.ts` (CDP virtual authenticator), `e2e/iam.spec.ts`,
  `e2e/audit.spec.ts`

**Steps:** run `pnpm ts.check`, `pnpm lint`, `pnpm test` (≥95%), `pnpm e2e`; drive each new page
with Playwright; then run the `/full-stack-validation` skill for the production-readiness verdict.

## Self-Review notes

- Every spec module (1–7) maps to a task above; cross-cutting crypto/permissions in Task 0;
  nav/seed/docs in Task 7; validation in Task 8.
- Types are shared via barrel exports; DTOs never expose `passwordHash`, `totpSecret`, or raw
  recovery codes.
