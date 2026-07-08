import mongoose, { type Model } from "mongoose";
import type { IPolicy } from "./types";

const StatementSchema = new mongoose.Schema(
  {
    effect: { type: String, enum: ["Allow", "Deny"], required: true },
    actions: { type: [String], required: true },
  },
  { _id: false },
);
const PolicySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    managed: { type: Boolean, default: false },
    statements: { type: [StatementSchema], default: [] },
  },
  { timestamps: true, collection: "policies" },
);
export const Policy: Model<IPolicy> =
  (mongoose.models.Policy as Model<IPolicy>) || mongoose.model<IPolicy>("Policy", PolicySchema);

export async function upsertPolicyByNameDB(p: {
  name: string;
  managed: boolean;
  statements: IPolicy["statements"];
}): Promise<IPolicy | null> {
  try {
    return await Policy.findOneAndUpdate(
      { name: p.name },
      { $set: p },
      { returnDocument: "after", upsert: true },
    ).lean<IPolicy>();
  } catch {
    return null;
  }
}
export async function getPolicyByNameDB({ name }: { name: string }): Promise<IPolicy | null> {
  try {
    return await Policy.findOne({ name }).lean<IPolicy>();
  } catch {
    return null;
  }
}
export async function listPoliciesByIdsDB({ ids }: { ids: string[] }): Promise<IPolicy[]> {
  try {
    return await Policy.find({ _id: { $in: ids } }).lean<IPolicy[]>();
  } catch {
    return [];
  }
}
export default Policy;
export * from "./types";
