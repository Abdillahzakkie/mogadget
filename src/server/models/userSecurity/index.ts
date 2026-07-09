import mongoose, { type Model } from "mongoose";
import type { IUserSecurity } from "./types";

const UserSecuritySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    totpSecret: { type: String, default: "" },
    totpEnabled: { type: Boolean, default: false },
    recoveryCodes: { type: [String], default: [] },
  },
  { timestamps: true, collection: "user_security" },
);

export const UserSecurity: Model<IUserSecurity> =
  (mongoose.models.UserSecurity as Model<IUserSecurity>) ||
  mongoose.model<IUserSecurity>("UserSecurity", UserSecuritySchema);

export async function getUserSecurityDB({
  userId,
}: {
  userId: string;
}): Promise<IUserSecurity | null> {
  try {
    return await UserSecurity.findOne({ userId }).lean<IUserSecurity>();
  } catch {
    return null;
  }
}

// Upsert a partial patch onto the user's security record.
export async function updateUserSecurityDB({
  userId,
  patch,
}: {
  userId: string;
  patch: Partial<Pick<IUserSecurity, "totpSecret" | "totpEnabled" | "recoveryCodes">>;
}): Promise<IUserSecurity | null> {
  try {
    return await UserSecurity.findOneAndUpdate(
      { userId },
      { $set: patch },
      { returnDocument: "after", upsert: true },
    ).lean<IUserSecurity>();
  } catch {
    return null;
  }
}

export default UserSecurity;
export * from "./types";
