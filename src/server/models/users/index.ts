import mongoose, { type Model } from "mongoose";
import type { IUser, IUserCreateInput, IUserProfileDto, IUserProfilePatch } from "./types";

const PreferencesSchema = new mongoose.Schema(
  { timezone: String, dateFormat: String },
  { _id: false },
);
const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    attachedPolicyIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    groupIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    displayName: { type: String, default: "" },
    email: { type: String, default: "" },
    avatarKey: { type: String, default: "" },
    preferences: { type: PreferencesSchema, default: () => ({}) },
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
export async function updateUserProfileDB({
  id,
  patch,
}: {
  id: string;
  patch: IUserProfilePatch;
}): Promise<IUser | null> {
  try {
    return await User.findByIdAndUpdate(
      id,
      { $set: patch },
      { returnDocument: "after" },
    ).lean<IUser>();
  } catch {
    return null;
  }
}
export async function updateUsernameDB({
  id,
  username,
}: {
  id: string;
  username: string;
}): Promise<IUser | null> {
  try {
    return await User.findByIdAndUpdate(
      id,
      { $set: { username } },
      { returnDocument: "after" },
    ).lean<IUser>();
  } catch {
    // Most likely a duplicate-key collision (username is unique).
    return null;
  }
}
export async function updateUserPasswordDB({
  id,
  passwordHash,
}: {
  id: string;
  passwordHash: string;
}): Promise<boolean> {
  try {
    const res = await User.updateOne({ _id: id }, { $set: { passwordHash } });
    return res.matchedCount > 0;
  } catch {
    return false;
  }
}

// Map a raw user document to the client-safe profile DTO (drops passwordHash, fills defaults).
export function toUserProfileDto(u: IUser): IUserProfileDto {
  return {
    _id: String(u._id),
    username: u.username,
    displayName: u.displayName ?? "",
    email: u.email ?? "",
    avatarKey: u.avatarKey ?? "",
    preferences: u.preferences ?? {},
    groupIds: (u.groupIds ?? []).map(String),
    attachedPolicyIds: (u.attachedPolicyIds ?? []).map(String),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export default User;
export * from "./types";
