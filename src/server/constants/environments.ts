export const INSECURE_SESSION_SECRET = "dev-insecure-secret-change-me";

// Best-effort hostname from an origin string; the WebAuthn Relying-Party ID must be the
// registrable domain (host only, no scheme/port). Falls back to "localhost".
function hostnameOf(origin: string): string {
  try {
    return new URL(origin).hostname;
  } catch {
    return "localhost";
  }
}

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/mogadget",
  // Explicit database name. Passed to mongoose as `dbName`, which overrides any DB in the
  // connection string — so a bare SRV URI (no `/db` path) still lands in the right database
  // instead of Mongo's default `test`.
  dbName: process.env.DB_NAME ?? "mogadget",
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  sessionSecret: process.env.SESSION_SECRET ?? INSECURE_SESSION_SECRET,
  trustProxy: process.env.TRUST_PROXY === "true",
  sessionMaxAgeSeconds: Number(process.env.SESSION_MAX_AGE ?? 60 * 60 * 24 * 7),
  siteUrl,

  // ── Credential encryption (TOTP secrets at rest) ────────────────────────────
  // AES-256-GCM key material. When unset we HKDF-derive it from SESSION_SECRET so local dev
  // works out of the box; `credentialKeyIsDerived` records that so the runtime boot guard can
  // refuse to start in production when a real key was never provided.
  credentialEncryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY ?? "",
  credentialKeyIsDerived: !process.env.CREDENTIAL_ENCRYPTION_KEY,

  // ── WebAuthn / passkeys ─────────────────────────────────────────────────────
  // rpId is the registrable domain (host only). webauthnOrigin is the full origin browsers
  // send in the client-data; it MUST equal the page origin or verification fails.
  rpId: process.env.RP_ID ?? hostnameOf(siteUrl),
  rpName: process.env.RP_NAME ?? "MoGadget",
  webauthnOrigin: process.env.WEBAUTHN_ORIGIN ?? siteUrl,

  storageDriver:
    (process.env.STORAGE_DRIVER as "local" | "s3" | undefined) ??
    (process.env.AWS_S3_BUCKET ? "s3" : "local"),
  localUploadDir: process.env.LOCAL_UPLOAD_DIR ?? ".uploads",
  s3Bucket: process.env.AWS_S3_BUCKET ?? "",
  s3Region: process.env.AWS_REGION ?? "us-east-1",
  // TTL for presigned S3 GET URLs (image display). Kept well above the page revalidate
  // window (default fetch revalidate is 300s) so ISR-cached pages don't serve expired URLs.
  s3SignedUrlTtlSeconds: Number(process.env.S3_SIGNED_URL_TTL ?? 60 * 60),
};
