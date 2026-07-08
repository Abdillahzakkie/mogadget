import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Heavy native / server-only deps must not be bundled into the route-handler
  // bundles. They are loaded from node_modules at runtime.
  serverExternalPackages: [
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
    "argon2",
    "ioredis",
    "mongoose",
    "pino",
    "prom-client",
  ],
};

export default nextConfig;
