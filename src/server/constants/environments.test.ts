import { describe, expect, it } from "vitest";
import { buildEnv, env, hostnameOf, INSECURE_SESSION_SECRET } from "./environments";

describe("hostnameOf", () => {
  it("extracts the hostname from a valid origin", () => {
    expect(hostnameOf("https://mogadget.ng:6060")).toBe("mogadget.ng");
    expect(hostnameOf("http://localhost:6060")).toBe("localhost");
  });
  it("falls back to localhost for an invalid origin", () => {
    expect(hostnameOf("not a url")).toBe("localhost");
    expect(hostnameOf("")).toBe("localhost");
  });
});

describe("buildEnv", () => {
  it("falls back to safe local-dev defaults when nothing is set", () => {
    const e = buildEnv({});
    expect(e.isProduction).toBe(false);
    expect(e.mongoUri).toContain("127.0.0.1");
    expect(e.dbName).toBe("mogadget");
    expect(e.redisUrl).toContain("6379");
    expect(e.sessionSecret).toBe(INSECURE_SESSION_SECRET);
    expect(e.trustProxy).toBe(false);
    expect(e.sessionMaxAgeSeconds).toBe(60 * 60 * 24 * 7);
    expect(e.siteUrl).toBe("http://localhost:3000");
    expect(e.credentialEncryptionKey).toBe("");
    expect(e.credentialKeyIsDerived).toBe(true);
    // rpId derives from the default siteUrl host; webauthnOrigin mirrors siteUrl.
    expect(e.rpId).toBe("localhost");
    expect(e.rpName).toBe("MoGadget");
    expect(e.webauthnOrigin).toBe("http://localhost:3000");
    expect(e.storageDriver).toBe("local");
    expect(e.localUploadDir).toBe(".uploads");
    expect(e.s3Bucket).toBe("");
    expect(e.s3Region).toBe("us-east-1");
    expect(e.s3SignedUrlTtlSeconds).toBe(60 * 60);
  });

  it("honours explicit values over defaults", () => {
    const e = buildEnv({
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://db:1/x",
      DB_NAME: "explicit",
      REDIS_URL: "redis://r:6379",
      SESSION_SECRET: "explicit-secret",
      TRUST_PROXY: "true",
      SESSION_MAX_AGE: "1234",
      SITE_URL: "https://shop.example",
      CREDENTIAL_ENCRYPTION_KEY: "explicit-key",
      RP_ID: "example.com",
      RP_NAME: "Shop",
      WEBAUTHN_ORIGIN: "https://origin.example",
      STORAGE_DRIVER: "s3",
      LOCAL_UPLOAD_DIR: "/data",
      AWS_S3_BUCKET: "bucket",
      AWS_REGION: "eu-west-1",
      S3_SIGNED_URL_TTL: "42",
    });
    expect(e.isProduction).toBe(true);
    expect(e.mongoUri).toBe("mongodb://db:1/x");
    expect(e.dbName).toBe("explicit");
    expect(e.sessionSecret).toBe("explicit-secret");
    expect(e.trustProxy).toBe(true);
    expect(e.sessionMaxAgeSeconds).toBe(1234);
    expect(e.credentialEncryptionKey).toBe("explicit-key");
    expect(e.credentialKeyIsDerived).toBe(false);
    expect(e.rpId).toBe("example.com");
    expect(e.rpName).toBe("Shop");
    expect(e.webauthnOrigin).toBe("https://origin.example");
    expect(e.storageDriver).toBe("s3");
    expect(e.s3Bucket).toBe("bucket");
    expect(e.s3SignedUrlTtlSeconds).toBe(42);
  });

  it("infers the s3 driver from a bucket when the driver is unset", () => {
    expect(buildEnv({ AWS_S3_BUCKET: "b" }).storageDriver).toBe("s3");
    expect(buildEnv({}).storageDriver).toBe("local");
  });

  it("exposes a resolved singleton env", () => {
    expect(typeof env.rpId).toBe("string");
  });
});
