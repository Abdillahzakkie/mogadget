import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "../constants/environments";

// Minted keys are `products/<uuid>.<ext>`. Require a real filename + extension and forbid the
// `..` segment so a key can never resolve outside the products namespace on disk.
const KEY_RE = /^products\/[A-Za-z0-9_-]+\.[a-z0-9]+$/;
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

// Magic-byte sniff: returns the canonical extension + content type for a genuine
// image payload, or null if the bytes are not a supported image (e.g. an HTML
// error page served with a lying `image/*` content-type, or a truncated download).
// Lets callers store only real, correctly-typed images instead of trusting headers.
export function sniffImageType(
  bytes: Uint8Array,
): { ext: "jpg" | "png" | "webp" | "gif"; contentType: string } | null {
  const b = bytes;
  if (b.length < 12) return null;
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", contentType: "image/jpeg" };
  // PNG: 89 50 4E 47
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return { ext: "png", contentType: "image/png" };
  // GIF: 47 49 46 38 ("GIF8")
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38)
    return { ext: "gif", contentType: "image/gif" };
  // WEBP: "RIFF" .... "WEBP"
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  )
    return { ext: "webp", contentType: "image/webp" };
  return null;
}

export function newImageKey(ext: string): string {
  const clean =
    (ext || "jpg")
      .replace(/^\./, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";
  return `products/${crypto.randomUUID()}.${clean}`;
}

export function resolveImageUrl(key: string): string {
  if (/^https?:\/\//.test(key)) return key;
  /* v8 ignore next -- S3 driver path, integration-tested against AWS, not in unit coverage */
  if (storageDriver() === "s3") return `${env.cdnBaseUrl.replace(/\/$/, "")}/${key}`;
  // Same-origin static serve (src/app/uploads/[...key]) — a relative URL keeps the
  // stored DTOs portable across dev/prod hostnames.
  return `/uploads/${key}`;
}

export async function signUpload(input: {
  contentType: string;
  ext: string;
}): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
  const key = newImageKey(input.ext);
  /* v8 ignore start -- S3 driver path: requires AWS SDK + live bucket, integration-tested, excluded from unit coverage */
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
  /* v8 ignore stop */
  // The blob route re-namespaces under products/, and the route's [key] segment matches a
  // single path segment — so the upload URL carries only the filename, not the slashed key.
  // Same-origin PUT (the CORS layer is gone), so a relative URL is all the browser needs.
  const fileName = key.split("/").pop() as string;
  return {
    key,
    uploadUrl: `/api/admin/uploads/blob/${fileName}`,
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

// Server-side blob store, driver-aware. Unlike signUpload (which mints a URL for the
// browser to PUT to), this writes bytes directly — used by the seed and any server code
// that already holds the image. Local → disk; s3 → PutObject with the default AWS
// credential provider chain (see .env docs). Throws on S3 failure so a misconfigured
// bucket/credentials surface loudly rather than silently dropping every image.
export async function putImageBlob(
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  /* v8 ignore start -- S3 driver path: requires AWS SDK + live bucket, integration-tested, excluded from unit coverage */
  if (storageDriver() === "s3") {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({ region: env.s3Region });
    await client.send(
      new PutObjectCommand({ Bucket: env.s3Bucket, Key: key, Body: bytes, ContentType: contentType }),
    );
    return;
  }
  /* v8 ignore stop */
  await writeLocalBlob(key, bytes);
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
