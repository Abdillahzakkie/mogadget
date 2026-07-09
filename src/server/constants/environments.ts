export const INSECURE_SESSION_SECRET = "dev-insecure-secret-change-me";

// Best-effort hostname from an origin string; the WebAuthn Relying-Party ID must be the
// registrable domain (host only, no scheme/port). Falls back to "localhost".
export function hostnameOf(origin: string): string {
  try {
    return new URL(origin).hostname;
  } catch {
    return "localhost";
  }
}

// Pure env resolver — takes the raw process env as input so both the "provided" and "default"
// side of every fallback can be unit-tested by passing two different sources.
export function buildEnv(src: Record<string, string | undefined>) {
  const siteUrl = src.SITE_URL ?? "http://localhost:3000";
  return {
    isProduction: src.NODE_ENV === "production",
    mongoUri: src.MONGODB_URI ?? "mongodb://127.0.0.1:27017/mogadget",
    // Explicit database name. Passed to mongoose as `dbName`, which overrides any DB in the
    // connection string — so a bare SRV URI (no `/db` path) still lands in the right database
    // instead of Mongo's default `test`.
    dbName: src.DB_NAME ?? "mogadget",
    redisUrl: src.REDIS_URL ?? "redis://127.0.0.1:6379",
    sessionSecret: src.SESSION_SECRET ?? INSECURE_SESSION_SECRET,
    trustProxy: src.TRUST_PROXY === "true",
    sessionMaxAgeSeconds: Number(src.SESSION_MAX_AGE ?? 60 * 60 * 24 * 7),
    siteUrl,

    // ── Credential encryption (TOTP secrets at rest) ──────────────────────────
    // AES-256-GCM key material. When unset we HKDF-derive it from SESSION_SECRET so local dev
    // works out of the box; `credentialKeyIsDerived` records that so the runtime boot guard can
    // refuse to start in production when a real key was never provided.
    credentialEncryptionKey: src.CREDENTIAL_ENCRYPTION_KEY ?? "",
    credentialKeyIsDerived: !src.CREDENTIAL_ENCRYPTION_KEY,

    // ── WebAuthn / passkeys ───────────────────────────────────────────────────
    // rpId is the registrable domain (host only). webauthnOrigin is the full origin browsers
    // send in the client-data; it MUST equal the page origin or verification fails.
    rpId: src.RP_ID ?? hostnameOf(siteUrl),
    rpName: src.RP_NAME ?? "MoGadget",
    webauthnOrigin: src.WEBAUTHN_ORIGIN ?? siteUrl,

    storageDriver:
      (src.STORAGE_DRIVER as "local" | "s3" | undefined) ?? (src.AWS_S3_BUCKET ? "s3" : "local"),
    localUploadDir: src.LOCAL_UPLOAD_DIR ?? ".uploads",
    s3Bucket: src.AWS_S3_BUCKET ?? "",
    s3Region: src.AWS_REGION ?? "us-east-1",
    // TTL for presigned S3 GET URLs (image display). Kept well above the page revalidate
    // window (default fetch revalidate is 300s) so ISR-cached pages don't serve expired URLs.
    s3SignedUrlTtlSeconds: Number(src.S3_SIGNED_URL_TTL ?? 60 * 60),
  };
}

export const env = buildEnv(process.env);
