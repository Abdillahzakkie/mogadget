import { connectMongoDB } from "../databases/mongoDB";
import { connectRedis } from "../databases/redis";
import { getLogger } from "../lib/logger";

export async function bootstrap(): Promise<void> {
  await connectMongoDB();
  await connectRedis();
  getLogger().info("mogadget core bootstrapped (mongo + redis)");
}
