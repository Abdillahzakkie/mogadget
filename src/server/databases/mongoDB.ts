import mongoose from "mongoose";
import { env } from "../constants/environments";

declare global {
  // eslint-disable-next-line no-var
  var __mogadgetMongo: Promise<typeof mongoose> | undefined;
}

export async function connectMongoDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (!globalThis.__mogadgetMongo)
    globalThis.__mogadgetMongo = mongoose.connect(env.mongoUri, { dbName: env.dbName });
  await globalThis.__mogadgetMongo;
}
export async function disconnectMongoDB(): Promise<void> {
  await mongoose.disconnect();
  globalThis.__mogadgetMongo = undefined;
}
