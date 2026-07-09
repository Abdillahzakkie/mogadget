# Admin Settings, Profile & Account Security — Design

**Date:** 2026-07-09
**Status:** Approved (proceed to plan)

## Summary

Add a cohesive **Admin Settings** area to MoGadget under `/admin/settings`, bringing
self-service account management, DB-backed site configuration, and hardened authentication
(passwordless passkeys + optional TOTP 2FA), plus admin surfaces for audit logs, analytics,
and IAM management. Everything follows the existing **Model → Service → Route** triad with
zod validators, Redis caching, and the `withApiHandler` / `withPermission` / `withRateLimit`
/ `withAudit` middleware stack.

### Deliberate scope note

[MOGADGET.md](../../../MOGADGET.md) §2 says "keep the auth model deliberately simple (one
admin login, not a role/permission system)." This feature **intentionally overrides** that
guidance at the owner's explicit request. As part of the work, MOGADGET.md's auth guidance is
updated so the doc and the code no longer contradict each other.

## Modules

### 1. Profile — `/admin/settings/profile` (any authenticated admin, self-service)

- Extend the `User` model with:
  - `displayName?: string`
  - `email?: string` — **metadata only**; no email/SMTP infrastructure exists, so it is
    never used for login, notifications, or recovery.
  - `avatarKey?: string` — reuses the existing storage/upload pipeline (`/admin/uploads/sign`).
  - `preferences: { timezone?: string; dateFormat?: string }`
- Actions: update profile fields; change username; change password (requires current password
  re-entry and re-hash via existing `hashPassword`).
- Service `services/profile/*`: `getMyProfile`, `updateProfile`, `changePassword`.
- Routes under `/api/admin/profile` (GET, PATCH) and `/api/admin/profile/password` (POST).
- Self-service: authenticated is sufficient; no extra permission required (a user always
  manages their own account).

### 2. Security — `/admin/settings/security` (self-service)

**Passkeys (WebAuthn) — `@simplewebauthn/server`**

- New model `webauthnCredentials`: `{ userId, credentialId (unique), publicKey, counter,
  transports[], deviceType, backedUp, nickname, createdAt, lastUsedAt }`.
- Registration ceremony: `POST /api/admin/security/passkeys/options` (generate + stash
  challenge in Redis, TTL 5 min, keyed by session sub) → client creates credential →
  `POST /api/admin/security/passkeys` verifies attestation and stores the credential.
- Manage: list, rename (`PATCH`), delete (`DELETE`) passkeys.
- **Passwordless login**: the login page gains "Sign in with a passkey". Flow:
  `POST /api/admin/login/passkey/options` (allow-list credentials, stash challenge) →
  client asserts → `POST /api/admin/login/passkey` verifies assertion, bumps counter,
  issues a **full** `mg_session` (a passkey is a strong single factor and skips TOTP).
- Config: `RP_ID`, `RP_NAME`, `WEBAUTHN_ORIGIN` env vars, defaulting from `SITE_URL`.

**TOTP 2FA — `otplib` + `qrcode`**

- Store on the user (or a dedicated `userSecurity` sub-document/model):
  `totpSecret` (**AES-256-GCM encrypted at rest**), `totpEnabled: boolean`,
  `recoveryCodes: string[]` (**bcrypt-hashed**, single-use).
- Enable: `POST /api/admin/security/totp/setup` returns an otpauth URL + QR data (secret shown
  once) → `POST /api/admin/security/totp/enable` verifies a code, flips `totpEnabled`, returns
  the recovery codes once.
- Disable: `POST /api/admin/security/totp/disable` requires a valid TOTP code.
- Regenerate recovery codes: `POST /api/admin/security/totp/recovery-codes` (requires a code).
- Secrets and recovery codes are returned to the client **only once**, at provisioning time.

### 3. Login flow changes

- Password step (`/api/admin/login`): on valid credentials, if `totpEnabled`, issue a
  short-lived **pending-2FA JWT** (distinct claim `stage: "totp"`, ~5 min, cannot satisfy
  `/admin` gating) instead of `mg_session`; response signals `mfaRequired: true`.
- Second step `POST /api/admin/login/totp`: accepts the pending token + a TOTP code **or** a
  recovery code; on success issues the real `mg_session` (and consumes the recovery code).
- Passkey login issues a full session directly.
- All new auth endpoints are `withRateLimit`-guarded (tight buckets for `login/totp`,
  `login/passkey`, and the setup endpoints).
- The edge proxy / `verifySession` must reject the pending-2FA token for protected sections.

### 4. Site Config — `/admin/settings/site` (`SettingsWrite`)

- New **singleton** model `siteConfig` (fixed `_id: "site"` or `singleton: true` guard):
  - `businessName`, `tagline`
  - `contact: { whatsapp, instagram, facebook, address, hours }`
  - `seo: { defaultTitle, defaultDescription, ogImageKey? }`
  - `toggles: { maintenanceMode: boolean, showSoldListings: boolean }`
- Defaults seed from today's hardcoded `CONTACT` / `WHATSAPP_NUMBER`
  ([src/server/validators/constants.ts](../../../src/server/validators/constants.ts)).
- `services/siteConfig/*`: `getSiteConfig` (Redis-cached, falls back to constant defaults on
  a cold DB), `updateSiteConfig` (validate → persist → invalidate cache → revalidate public
  routes). Consumed by public pages and the WhatsApp link builder in place of the constant.
- `maintenanceMode` renders a public maintenance screen (admin still reachable);
  `showSoldListings` gates whether SOLD pre-owned listings appear publicly.

### 5. Audit viewer — `/admin/settings/audit` (`AuditRead`)

- Extend `listAuditLogsDB` → `queryAuditLogsDB({ action?, userId?, from?, to?, page?, limit? })`
  with total count for pagination. New `services/audit/*` + `GET /api/admin/audit`.
- Filterable, paginated table UI resolving `userId` → username.

### 6. Analytics — `/admin/settings/analytics` (`AnalyticsRead`)

- Dedicated page reusing the existing analytics service + `AdminAnalytics` component; the
  dashboard keeps its summary card. Mostly surfaces what already exists.

### 7. IAM management — `/admin/settings/iam` (`IamManage`)

- **Users / Groups / Policies** full CRUD:
  - Users: list, create, edit (attach `groupIds` / `attachedPolicyIds`), reset password, delete.
  - Groups: list, create, edit (`policyIds` + inline `statements`), delete.
  - Policies: list, create, edit `statements`, delete.
- Validation via zod + `isValidPolicyStatement` / `isValidPolicyAction`.
- **Safety guards** (enforced in services, covered by tests):
  - You cannot remove your own last admin access (self-lockout prevention).
  - You cannot delete the last user with `iam:manage` / administrator access.
  - You cannot delete or rename `managed: true` built-ins.
- Mutations invalidate the effective-permissions cache (`invalidateEffectivePermissions`).
- New CRUD DB helpers on the `users` / `groups` / `policies` models where missing, plus
  `services/iam/*` CRUD services and `/api/admin/iam/{users,groups,policies}` routes.

## Cross-cutting concerns

- **Secrets at rest**: a `lib/crypto.ts` AES-256-GCM helper keyed by `CREDENTIAL_ENCRYPTION_KEY`
  (HKDF-derived from `SESSION_SECRET` as a dev fallback). Encrypts `totpSecret`; recovery codes
  are bcrypt-hashed. In `NODE_ENV=production`, boot **refuses** if credential encryption would
  fall back to the derived dev key while any 2FA/passkey feature is configured.
- **Permissions**: add `SettingsWrite = "settings:write"` to the `Permission` enum + built-in
  `AdministratorAccess` already covers it via `*`. Reuse `AuditRead`, `AnalyticsRead`,
  `IamManage`. Update `SECTION_PERMISSIONS` and admin nav so each sub-section renders/authorizes
  by its permission. Session `perms` (or an effective-permissions fetch) drives nav visibility.
- **Nav**: `AdminHeader` gains a "Settings" entry; a settings landing page with cards links to
  each sub-section the current admin may access.
- **New dependencies**: `@simplewebauthn/server`, `otplib`, `qrcode`, `@types/qrcode` (dev).
- **Env additions** (documented in `.env.example`): `CREDENTIAL_ENCRYPTION_KEY`, `RP_ID`,
  `RP_NAME`, `WEBAUTHN_ORIGIN`.

## Data flow

```
Public page  ─┐
              ├─► getSiteConfig() ──► Redis cache ──(miss)──► siteConfig singleton ──(cold)──► CONTACT defaults
WA link  ─────┘

Login (password) ──► valid? ──► totpEnabled? ──yes──► pending-2FA JWT ──► /login/totp ──► mg_session
                                          └──no──► mg_session
Login (passkey)  ──► assertion verified ──► mg_session

Admin settings mutation ──► withPermission ──► service ──► model ──► cache invalidate ──► withAudit
```

## Error handling

- All routes return the standard `IEnvelope` via `fail(code, message)` / `ok(data)`.
- Auth failures use `ErrUnauthenticated` / `ErrUnauthorized`; validation via `validateBody`.
- WebAuthn/TOTP verification failures are generic ("Invalid code") to avoid oracle leakage.
- Best-effort operations (audit write, cache invalidation) never block the primary response.

## Testing strategy

- **Unit (Vitest, ≥95% coverage, real Mongo + Redis)** for every new service:
  encrypt/decrypt round-trip; TOTP setup/enable/disable/verify; recovery-code single-use
  consumption; site-config cache hit/miss + cold fallback + invalidation; IAM CRUD guards
  (self-lockout, last-admin, managed built-ins); audit query filters + pagination; passkey
  verification with mocked `@simplewebauthn/server`.
- **Playwright e2e (single origin)**: enable 2FA → re-login through the TOTP step (generate
  codes from the known secret); passkey register + login via CDP **virtual authenticator**;
  edit site config → assert reflected on a public page; IAM create-user; audit viewer shows a
  logged action; maintenance-mode toggle gates the public site.
- Finish with the **/full-stack-validation** production-readiness pass.

## Suggested build order

1. Site Config (foundational; replaces a hardcoded constant)
2. Profile (account basics)
3. Audit viewer + Analytics page (read-only, reuse)
4. IAM management CRUD
5. TOTP 2FA + login flow
6. Passkeys (WebAuthn)

Each module ships its model/service/route/validator/UI + tests before the next begins.
