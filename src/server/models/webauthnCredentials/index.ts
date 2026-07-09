import mongoose, { type Model } from "mongoose";
import type { IWebauthnCredential, IWebauthnCredentialCreateInput } from "./types";

const WebauthnCredentialSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    credentialId: { type: String, required: true, unique: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, required: true, default: 0 },
    transports: { type: [String], default: [] },
    deviceType: { type: String },
    backedUp: { type: Boolean },
    nickname: { type: String, required: true, default: "Passkey" },
    lastUsedAt: { type: Date },
  },
  { timestamps: true, collection: "webauthn_credentials" },
);

export const WebauthnCredential: Model<IWebauthnCredential> =
  (mongoose.models.WebauthnCredential as Model<IWebauthnCredential>) ||
  mongoose.model<IWebauthnCredential>("WebauthnCredential", WebauthnCredentialSchema);

export async function createCredentialDB(
  input: IWebauthnCredentialCreateInput,
): Promise<IWebauthnCredential | null> {
  try {
    return (await WebauthnCredential.create([input]))[0]?.toObject() as IWebauthnCredential;
  } catch {
    return null;
  }
}

export async function listCredentialsByUserDB({
  userId,
}: {
  userId: string;
}): Promise<IWebauthnCredential[]> {
  try {
    return await WebauthnCredential.find({ userId })
      .sort({ createdAt: -1 })
      .lean<IWebauthnCredential[]>();
  } catch {
    return [];
  }
}

export async function getCredentialByCredentialIdDB({
  credentialId,
}: {
  credentialId: string;
}): Promise<IWebauthnCredential | null> {
  try {
    return await WebauthnCredential.findOne({ credentialId }).lean<IWebauthnCredential>();
  } catch {
    return null;
  }
}

export async function updateCredentialCounterDB({
  credentialId,
  counter,
  lastUsedAt,
}: {
  credentialId: string;
  counter: number;
  lastUsedAt?: Date;
}): Promise<IWebauthnCredential | null> {
  try {
    return await WebauthnCredential.findOneAndUpdate(
      { credentialId },
      { $set: { counter, lastUsedAt: lastUsedAt ?? new Date() } },
      { returnDocument: "after" },
    ).lean<IWebauthnCredential>();
  } catch {
    return null;
  }
}

export async function renameCredentialDB({
  id,
  userId,
  nickname,
}: {
  id: string;
  userId: string;
  nickname: string;
}): Promise<IWebauthnCredential | null> {
  try {
    // Scope by userId so a user can only rename credentials they own.
    return await WebauthnCredential.findOneAndUpdate(
      { _id: id, userId },
      { $set: { nickname } },
      { returnDocument: "after" },
    ).lean<IWebauthnCredential>();
  } catch {
    return null;
  }
}

export async function deleteCredentialDB({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<boolean> {
  try {
    // Scope by userId so a user can only delete credentials they own.
    const res = await WebauthnCredential.deleteOne({ _id: id, userId });
    return res.deletedCount === 1;
  } catch {
    return false;
  }
}

// All stored credentials across the single admin owner. Used to build `allowCredentials` at
// login time (pre-session, so we cannot scope by a user id yet).
export async function listAllCredentialsDB(): Promise<IWebauthnCredential[]> {
  try {
    return await WebauthnCredential.find().lean<IWebauthnCredential[]>();
  } catch {
    return [];
  }
}

export default WebauthnCredential;
export * from "./types";
