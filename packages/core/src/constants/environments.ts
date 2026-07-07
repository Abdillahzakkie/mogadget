export const env = {
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/mogadget",
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me",
  sessionMaxAgeSeconds: Number(process.env.SESSION_MAX_AGE ?? 60 * 60 * 24 * 7),
  siteUrl: process.env.SITE_URL ?? "http://localhost:3000",
};
