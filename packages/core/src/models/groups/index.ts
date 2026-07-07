import mongoose, { type Model } from "mongoose";
import type { IGroup } from "./types";

const StatementSchema = new mongoose.Schema(
  {
    effect: { type: String, enum: ["Allow", "Deny"], required: true },
    actions: { type: [String], required: true },
  },
  { _id: false },
);
const GroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    managed: { type: Boolean, default: false },
    policyIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    statements: { type: [StatementSchema], default: [] },
  },
  { timestamps: true, collection: "groups" },
);
export const Group: Model<IGroup> =
  (mongoose.models.Group as Model<IGroup>) || mongoose.model<IGroup>("Group", GroupSchema);

export async function upsertGroupByNameDB(g: {
  name: string;
  managed: boolean;
  policyIds: string[];
  statements?: IGroup["statements"];
}): Promise<IGroup | null> {
  try {
    return await Group.findOneAndUpdate(
      { name: g.name },
      { $set: { ...g, statements: g.statements ?? [] } },
      { returnDocument: "after", upsert: true },
    ).lean<IGroup>();
  } catch {
    return null;
  }
}
export async function getGroupByNameDB({ name }: { name: string }): Promise<IGroup | null> {
  try {
    return await Group.findOne({ name }).lean<IGroup>();
  } catch {
    return null;
  }
}
export async function listGroupsByIdsDB({ ids }: { ids: string[] }): Promise<IGroup[]> {
  try {
    return await Group.find({ _id: { $in: ids } }).lean<IGroup[]>();
  } catch {
    return [];
  }
}
export default Group;
export * from "./types";
