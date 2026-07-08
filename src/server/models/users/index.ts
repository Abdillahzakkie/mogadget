import mongoose, { type Model } from "mongoose";
import type { IUser, IUserCreateInput } from "./types";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    attachedPolicyIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    groupIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  },
  { timestamps: true, collection: "users" },
);
export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>("User", UserSchema);

export async function getUserByUsernameDB({
  username,
}: {
  username: string;
}): Promise<IUser | null> {
  try {
    return await User.findOne({ username }).lean<IUser>();
  } catch {
    return null;
  }
}
export async function getUserByIdDB({ id }: { id: string }): Promise<IUser | null> {
  try {
    return await User.findById(id).lean<IUser>();
  } catch {
    return null;
  }
}
export async function createUserDB(input: IUserCreateInput): Promise<IUser | null> {
  try {
    return (await User.create([input]))[0]!.toObject() as IUser;
  } catch {
    return null;
  }
}
export async function upsertUserByUsernameDB(input: IUserCreateInput): Promise<IUser | null> {
  try {
    return await User.findOneAndUpdate(
      { username: input.username },
      { $set: input },
      { returnDocument: "after", upsert: true },
    ).lean<IUser>();
  } catch {
    return null;
  }
}
export default User;
export * from "./types";
