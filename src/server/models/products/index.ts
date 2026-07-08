import mongoose, { type Model } from "mongoose";
import { databaseResponseTimeHistogram, IOperationType } from "../../metrics";
import type {
  IProduct,
  IProductCreateInput,
  IProductListFilter,
  IProductUpdateInput,
  TClickChannel,
} from "./types";

const collectionName = "products";

const ImageSchema = new mongoose.Schema(
  { key: String, sortOrder: { type: Number, default: 0 } },
  { _id: false },
);
const SpecSchema = new mongoose.Schema({ label: String, value: String }, { _id: false });

const ProductSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["PHONES", "LAPTOPS", "AUDIO", "WEARABLES", "CONSOLES", "OTHER"],
    },
    brand: { type: String, required: true, trim: true },
    condition: { type: String, required: true, enum: ["NEW", "UK_USED", "US_USED", "NG_USED"] },
    cosmeticGrade: { type: String, enum: ["A", "B", "C", null], default: null },
    priceNaira: { type: Number, required: true, min: 1 },
    description: { type: String, default: null },
    stockType: { type: String, required: true, enum: ["RESTOCKABLE", "UNIQUE_UNIT"] },
    status: {
      type: String,
      required: true,
      enum: ["IN_STOCK", "OUT_OF_STOCK", "AVAILABLE", "SOLD"],
    },
    quantity: { type: Number, default: null },
    isVisible: { type: Boolean, default: true },
    images: { type: [ImageSchema], default: [] },
    specs: { type: [SpecSchema], default: [] },
    whatsappClickCount: { type: Number, default: 0 },
    instagramClickCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: collectionName },
);
ProductSchema.index({ isVisible: 1, category: 1, condition: 1, priceNaira: 1 });
ProductSchema.index({ name: "text", brand: "text", description: "text" });

export const Product: Model<IProduct> =
  (mongoose.models.Product as Model<IProduct>) ||
  mongoose.model<IProduct>("Product", ProductSchema);

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { priceNaira: 1 },
  price_desc: { priceNaira: -1 },
} as const;

export async function listProductsDB(f: IProductListFilter = {}): Promise<IProduct[]> {
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    const query: Record<string, unknown> = {};
    // Public list (default) and admin non-includeHidden both restrict to visible.
    if (!(f.status === "all" && f.includeHidden)) query.isVisible = true;
    if (f.category) query.category = f.category;
    if (f.condition?.length) query.condition = { $in: f.condition };
    if (f.brand?.length) query.brand = { $in: f.brand };
    if (f.min != null || f.max != null) {
      query.priceNaira = {
        ...(f.min != null && { $gte: f.min }),
        ...(f.max != null && { $lte: f.max }),
      };
    }
    if (f.q) query.$text = { $search: f.q };
    const result = await Product.find(query)
      .sort(SORTS[f.sort ?? "newest"])
      .limit(f.limit ?? 60)
      .lean<IProduct[]>();
    // SOLD / OUT_OF_STOCK always sink below available items (product doc §5.2).
    const rank = (p: IProduct) => (p.status === "SOLD" || p.status === "OUT_OF_STOCK" ? 1 : 0);
    result.sort((a, b) => rank(a) - rank(b));
    timer({
      operation: IOperationType.Read,
      collection: collectionName,
      method: "listProductsDB",
      success: "true",
    });
    return result;
  } catch {
    timer({
      operation: IOperationType.Read,
      collection: collectionName,
      method: "listProductsDB",
      success: "false",
    });
    return [];
  }
}

export async function getProductBySlugDB({ slug }: { slug: string }): Promise<IProduct | null> {
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    const r = await Product.findOne({ slug, isVisible: true }).lean<IProduct>();
    timer({
      operation: IOperationType.Read,
      collection: collectionName,
      method: "getProductBySlugDB",
      success: r ? "true" : "false",
    });
    return r;
  } catch {
    timer({
      operation: IOperationType.Read,
      collection: collectionName,
      method: "getProductBySlugDB",
      success: "false",
    });
    return null;
  }
}

export async function getProductBySlugAnyStatusDB({
  slug,
}: {
  slug: string;
}): Promise<IProduct | null> {
  try {
    return await Product.findOne({ slug }).lean<IProduct>();
  } catch {
    return null;
  }
}
export async function getProductByIdDB({ id }: { id: string }): Promise<IProduct | null> {
  try {
    return await Product.findById(id).lean<IProduct>();
  } catch {
    return null;
  }
}
export async function createProductDB(input: IProductCreateInput): Promise<IProduct | null> {
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    const doc = (await Product.create([input]))[0]!;
    timer({
      operation: IOperationType.Write,
      collection: collectionName,
      method: "createProductDB",
      success: "true",
    });
    return doc.toObject() as IProduct;
  } catch {
    timer({
      operation: IOperationType.Write,
      collection: collectionName,
      method: "createProductDB",
      success: "false",
    });
    return null;
  }
}
export async function updateProductByIdDB({
  id,
  patch,
}: {
  id: string;
  patch: IProductUpdateInput;
}): Promise<IProduct | null> {
  try {
    return await Product.findByIdAndUpdate(
      id,
      { $set: patch },
      { returnDocument: "after" },
    ).lean<IProduct>();
  } catch {
    return null;
  }
}
export async function deleteProductByIdDB({ id }: { id: string }): Promise<boolean> {
  try {
    return (await Product.deleteOne({ _id: id })).deletedCount > 0;
  } catch {
    return false;
  }
}
export async function countProductsDB(f: IProductListFilter = {}): Promise<number> {
  try {
    return await Product.countDocuments(
      f.category ? { isVisible: true, category: f.category } : { isVisible: true },
    );
  } catch {
    return 0;
  }
}
export async function productFacetsDB(): Promise<{
  categories: Record<string, number>;
  conditions: Record<string, number>;
}> {
  try {
    const [cats, conds] = await Promise.all([
      Product.aggregate<{ _id: string; n: number }>([
        { $match: { isVisible: true } },
        { $group: { _id: "$category", n: { $sum: 1 } } },
      ]),
      Product.aggregate<{ _id: string; n: number }>([
        { $match: { isVisible: true } },
        { $group: { _id: "$condition", n: { $sum: 1 } } },
      ]),
    ]);
    const toMap = (rows: { _id: string; n: number }[]) =>
      Object.fromEntries(rows.map((r) => [r._id, r.n]));
    return { categories: toMap(cats), conditions: toMap(conds) };
  } catch {
    return { categories: {}, conditions: {} };
  }
}
export async function incrementClickDB({
  slug,
  channel,
}: {
  slug: string;
  channel: TClickChannel;
}): Promise<boolean> {
  try {
    const field = channel === "whatsapp" ? "whatsappClickCount" : "instagramClickCount";
    const r = await Product.updateOne({ slug }, { $inc: { [field]: 1 } });
    return r.matchedCount > 0;
  } catch {
    return false;
  }
}

export default Product;
export * from "./types";
