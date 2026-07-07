const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function shortId(len = 4): string {
  let out = "";
  const bytes = new Uint8Array(len);
  globalThis.crypto.getRandomValues(bytes);
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
export function generateSlug(name: string): string {
  return `${slugify(name)}-${shortId(4)}`;
}
