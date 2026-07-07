import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "../constants/environments";

const KEY_RE = /^products\/[A-Za-z0-9._-]+$/;
const EXT_CT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function storageDriver(): "local" | "s3" {
  return env.storageDriver === "s3" ? "s3" : "local";
}

export function newImageKey(ext: string): string {
  const clean =
    (ext || "jpg").replace(/^\./, "").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `products/${crypto.randomUUID()}.${clean}`;
}

export function resolveImageUrl(key: string): string {
  if (/^https?:\/\//.test(key)) return key;
  if (storageDriver() === "s3") return `${env.cdnBaseUrl.replace(/\/$/, "")}/${key}`;
  return `${env.apiOrigin.replace(/\/$/, "")}/uploads/${key}`;
}

export async function signUpload(input: {
  contentType: string;
  ext: string;
}): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
  const key = newImageKey(input.ext);
  if (storageDriver() === "s3") {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = new S3Client({ region: env.s3Region });
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: env.s3Bucket, Key: key, ContentType: input.contentType }),
      { expiresIn: 300 },
    );
    return { key, uploadUrl, publicUrl: resolveImageUrl(key) };
  }
  return {
    key,
    uploadUrl: `${env.apiOrigin.replace(/\/$/, "")}/api/admin/uploads/blob/${key}`,
    publicUrl: resolveImageUrl(key),
  };
}

function localPath(key: string): string {
  if (!KEY_RE.test(key)) throw new Error("invalid key");
  return path.join(env.localUploadDir, key);
}

export async function writeLocalBlob(key: string, bytes: Uint8Array): Promise<void> {
  const p = localPath(key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, bytes);
}

export async function readLocalBlob(
  key: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  try {
    const bytes = await fs.readFile(localPath(key));
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    return { bytes, contentType: EXT_CT[ext] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}
