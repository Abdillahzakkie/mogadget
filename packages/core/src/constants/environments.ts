export const INSECURE_SESSION_SECRET = "dev-insecure-secret-change-me";
export const INSECURE_REVALIDATE_SECRET = "dev-revalidate-secret-change-me";

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/mogadget",
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  sessionSecret: process.env.SESSION_SECRET ?? INSECURE_SESSION_SECRET,
  sessionMaxAgeSeconds: Number(process.env.SESSION_MAX_AGE ?? 60 * 60 * 24 * 7),
  siteUrl: process.env.SITE_URL ?? "http://localhost:3000",
  revalidateSecret: process.env.REVALIDATE_SECRET ?? INSECURE_REVALIDATE_SECRET,
  storageDriver:
    (process.env.STORAGE_DRIVER as "local" | "s3" | undefined) ??
    (process.env.AWS_S3_BUCKET ? "s3" : "local"),
  apiOrigin: process.env.API_ORIGIN ?? "http://localhost:4000",
  localUploadDir: process.env.LOCAL_UPLOAD_DIR ?? ".uploads",
  s3Bucket: process.env.AWS_S3_BUCKET ?? "",
  s3Region: process.env.AWS_REGION ?? "us-east-1",
  cdnBaseUrl: process.env.CDN_BASE_URL ?? "",
};
