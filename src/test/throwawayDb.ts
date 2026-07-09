import mongoose from "mongoose";
import { env } from "@/server/constants/environments";

// Connects the DEFAULT mongoose connection to a unique, per-run throwaway database so tests
// never read or write the real/dev DB. Mongoose models bind to the default connection at query
// time, so calling this in beforeAll (before any query) is sufficient. Pair with
// dropThrowawayDB() in afterAll to drop the DB and disconnect.
export async function connectThrowawayDB(label: string): Promise<string> {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  const dbName = `mogadget-test-${label}-${process.pid}-${Date.now()}`;
  await mongoose.connect(env.mongoUri, { dbName });
  return dbName;
}

export async function dropThrowawayDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
