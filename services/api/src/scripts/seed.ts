import {
  bootstrap,
  models,
  hashPassword,
  generateSlug,
  disconnectMongoDB,
  writeLocalBlob,
  newImageKey,
} from "@mogadget/core";
import { iam } from "@mogadget/contracts";

const OWNER_USERNAME = process.env.SEED_OWNER_USERNAME ?? "owner";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "password";

// Real product photos, keyed by product name. Downloaded at seed time and stored as
// local blobs (served by the API at /uploads/*), so the catalog has valid images with no
// render-time network dependency. Two entries → the detail-page gallery has a thumbnail to switch.
const IMAGE_SOURCES: Record<string, string[]> = {
  "iPhone 13 128GB Midnight": [
    "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=1000&q=70&fm=jpg",
    "https://images.unsplash.com/photo-1592286927505-1def25115558?w=1000&q=70&fm=jpg",
  ],
  "iPhone 15 Pro Max 256GB": [
    "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1000&q=70&fm=jpg",
    "https://images.unsplash.com/photo-1696446701796-da61225697cc?w=1000&q=70&fm=jpg",
  ],
  "PlayStation 5 Slim (Disc)": [
    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=1000&q=70&fm=jpg",
  ],
  'MacBook Air M2 13" 8/256GB': [
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1000&q=70&fm=jpg",
  ],
  "iPhone 12 64GB White": [
    "https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=1000&q=70&fm=jpg",
  ],
  "AirPods Pro (2nd gen)": [
    "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=1000&q=70&fm=jpg",
  ],
  "Samsung Galaxy S21 128GB": [
    "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=1000&q=70&fm=jpg",
  ],
  "Apple Watch Series 8 45mm": [
    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=1000&q=70&fm=jpg",
  ],
  "iPad Air M2 (draft)": [
    "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=1000&q=70&fm=jpg",
  ],
};

// Guaranteed-valid deterministic fallback if a curated photo fails to download.
function fallbackUrl(name: string, i: number): string {
  const seed = encodeURIComponent(`${name}-${i}`.replace(/[^A-Za-z0-9]/g, ""));
  return `https://picsum.photos/seed/${seed}/1000/750.jpg`;
}

async function fetchImage(url: string): Promise<Uint8Array | null> {
  try {
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return null;
    const bytes = new Uint8Array(await r.arrayBuffer());
    return bytes.byteLength > 512 ? bytes : null; // reject tiny/error payloads
  } catch {
    return null;
  }
}

// Download → store as a local blob → return the storage key. Falls back to Picsum, then null.
async function seedImage(name: string, url: string, i: number): Promise<string | null> {
  const bytes = (await fetchImage(url)) ?? (await fetchImage(fallbackUrl(name, i)));
  if (!bytes) return null;
  const key = newImageKey("jpg");
  await writeLocalBlob(key, bytes);
  return key;
}

const DEMO = [
  {
    name: "iPhone 13 128GB Midnight",
    category: "PHONES",
    brand: "iPhone",
    condition: "UK_USED",
    cosmeticGrade: "A",
    priceNaira: 485000,
    stockType: "UNIQUE_UNIT",
    status: "AVAILABLE",
    quantity: null,
    isVisible: true,
    specs: [
      { label: "Battery health", value: "89%" },
      { label: "Screen", value: "Original, no scratches" },
    ],
  },
  {
    name: "iPhone 15 Pro Max 256GB",
    category: "PHONES",
    brand: "iPhone",
    condition: "NEW",
    cosmeticGrade: null,
    priceNaira: 1850000,
    stockType: "RESTOCKABLE",
    status: "IN_STOCK",
    quantity: 4,
    isVisible: true,
    specs: [],
  },
  {
    name: "PlayStation 5 Slim (Disc)",
    category: "CONSOLES",
    brand: "PlayStation",
    condition: "NEW",
    cosmeticGrade: null,
    priceNaira: 985000,
    stockType: "RESTOCKABLE",
    status: "IN_STOCK",
    quantity: 6,
    isVisible: true,
    specs: [],
  },
  {
    name: 'MacBook Air M2 13" 8/256GB',
    category: "LAPTOPS",
    brand: "MacBook",
    condition: "US_USED",
    cosmeticGrade: "B",
    priceNaira: 1150000,
    stockType: "UNIQUE_UNIT",
    status: "AVAILABLE",
    quantity: null,
    isVisible: true,
    specs: [],
  },
  {
    name: "iPhone 12 64GB White",
    category: "PHONES",
    brand: "iPhone",
    condition: "NG_USED",
    cosmeticGrade: "B",
    priceNaira: 320000,
    stockType: "UNIQUE_UNIT",
    status: "SOLD",
    quantity: null,
    isVisible: true,
    specs: [],
  },
  {
    // NEW but sold out — exercises the OUT_OF_STOCK ribbon/greying + "sinks below available".
    name: "AirPods Pro (2nd gen)",
    category: "AUDIO",
    brand: "AirPods",
    condition: "NEW",
    cosmeticGrade: null,
    priceNaira: 235000,
    stockType: "RESTOCKABLE",
    status: "OUT_OF_STOCK",
    quantity: 0,
    isVisible: true,
    specs: [],
  },
  {
    // Pre-owned grade C — exercises the grade-C glossary row + lowest-grade styling.
    name: "Samsung Galaxy S21 128GB",
    category: "PHONES",
    brand: "Samsung",
    condition: "NG_USED",
    cosmeticGrade: "C",
    priceNaira: 210000,
    stockType: "UNIQUE_UNIT",
    status: "AVAILABLE",
    quantity: null,
    isVisible: true,
    specs: [
      { label: "Battery health", value: "82%" },
      { label: "Notes", value: "Visible wear on frame; screen flawless" },
    ],
  },
  {
    // Adds the WEARABLES facet so category filtering has >1 non-empty branch beyond phones.
    name: "Apple Watch Series 8 45mm",
    category: "WEARABLES",
    brand: "Apple Watch",
    condition: "UK_USED",
    cosmeticGrade: "A",
    priceNaira: 260000,
    stockType: "UNIQUE_UNIT",
    status: "AVAILABLE",
    quantity: null,
    isVisible: true,
    specs: [],
  },
  {
    // Hidden draft — must 404 on the public detail route and be absent from lists/facets.
    name: "iPad Air M2 (draft)",
    category: "OTHER",
    brand: "iPad",
    condition: "NEW",
    cosmeticGrade: null,
    priceNaira: 720000,
    stockType: "RESTOCKABLE",
    status: "IN_STOCK",
    quantity: 2,
    isVisible: false,
    specs: [],
  },
] as const;

async function main() {
  // Mirror bootstrap's refuse-insecure-defaults stance: never seed the well-known dev
  // credentials into a production database.
  if (process.env.NODE_ENV === "production" && OWNER_PASSWORD === "password") {
    throw new Error(
      "Refusing to seed the default owner password in production. Set SEED_OWNER_PASSWORD.",
    );
  }
  await bootstrap();

  // 1) IAM built-in policies + groups.
  const policyIdByName: Record<string, string> = {};
  for (const p of iam.BUILTIN_POLICIES) {
    const doc = await models.policies.upsertPolicyByNameDB({
      name: p.name,
      managed: p.managed,
      statements: [...p.statements],
    });
    if (doc) policyIdByName[p.name] = String(doc._id);
  }
  const groupIdByName: Record<string, string> = {};
  for (const g of iam.BUILTIN_GROUPS) {
    const doc = await models.groups.upsertGroupByNameDB({
      name: g.name,
      managed: g.managed,
      policyIds: g.policyNames.map((n) => policyIdByName[n]!).filter(Boolean),
    });
    if (doc) groupIdByName[g.name] = String(doc._id);
  }

  // 2) Owner in Administrators.
  await models.users.upsertUserByUsernameDB({
    username: OWNER_USERNAME,
    passwordHash: await hashPassword(OWNER_PASSWORD),
    groupIds: [groupIdByName.Administrators!],
  });

  // 3) Demo products. Teardown-by-name then recreate → idempotent & re-runnable, and
  // guarantees every product carries freshly-downloaded images even on a re-seed.
  const names = DEMO.map((d) => d.name);
  await models.products.Product.deleteMany({ name: { $in: names } });

  let imageCount = 0;
  for (const d of DEMO) {
    const sources = IMAGE_SOURCES[d.name] ?? [];
    const images: { key: string; sortOrder: number }[] = [];
    for (let i = 0; i < sources.length; i++) {
      const key = await seedImage(d.name, sources[i]!, i);
      if (key) images.push({ key, sortOrder: i });
    }
    imageCount += images.length;
    await models.products.createProductDB({
      name: d.name,
      category: d.category,
      brand: d.brand,
      condition: d.condition,
      cosmeticGrade: d.cosmeticGrade,
      priceNaira: d.priceNaira,
      stockType: d.stockType,
      status: d.status,
      quantity: d.quantity,
      isVisible: d.isVisible,
      slug: generateSlug(d.name),
      description: null,
      images,
      specs: [...d.specs],
    });
  }

  console.log(
    `\nSeed complete. ${DEMO.length} products, ${imageCount} images stored.` +
      `\nOwner login → username: ${OWNER_USERNAME} · password: ${OWNER_PASSWORD}\n`,
  );
  await disconnectMongoDB();
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
