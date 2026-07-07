import { bootstrap, models, hashPassword, generateSlug, disconnectMongoDB } from "@mogadget/core";
import { iam } from "@mogadget/contracts";

const OWNER_USERNAME = process.env.SEED_OWNER_USERNAME ?? "owner";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "password";

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
    specs: [],
  },
] as const;

async function main() {
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

  // 3) Demo products (idempotent by name).
  const existing = await models.products.listProductsDB({ status: "all", includeHidden: true });
  const existingNames = new Set(existing.map((x) => x.name));
  for (const d of DEMO) {
    if (existingNames.has(d.name)) continue;
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
      slug: generateSlug(d.name),
      description: null,
      images: [],
      specs: [...d.specs],
    });
  }

  console.log(
    `\nSeed complete. Owner login → username: ${OWNER_USERNAME} · password: ${OWNER_PASSWORD}\n`,
  );
  await disconnectMongoDB();
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
