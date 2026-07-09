import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { env } from "../constants/environments";

// AES-256-GCM encryption for secrets held at rest (currently TOTP shared secrets). The stored
// format is `v1:<iv b64>:<tag b64>:<ciphertext b64>` — a self-describing, versioned string so
// the algorithm can evolve without a data migration guessing game.
const VERSION = "v1";
const IV_BYTES = 12; // 96-bit nonce, the GCM standard.

// Derive a stable 32-byte key from the configured key material via HKDF-SHA256. Using HKDF means
// the operator can supply any-length CREDENTIAL_ENCRYPTION_KEY (or, in dev, we fall back to the
// session secret) and we still get a well-formed 256-bit key.
function deriveKey(): Buffer {
  const material = env.credentialEncryptionKey || env.sessionSecret;
  return Buffer.from(
    hkdfSync("sha256", material, "mogadget-cred-salt", "credential-encryption", 32),
  );
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("crypto: malformed or unsupported payload");
  }
  const [, ivB64, tagB64, ctB64] = parts as [string, string, string, string];
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString(
    "utf8",
  );
}
