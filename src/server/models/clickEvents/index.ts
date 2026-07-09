import mongoose, { type Model } from "mongoose";
import type { IClickDayRow, TClickChannel } from "@/server/validators/types";
import { databaseResponseTimeHistogram, IOperationType } from "../../metrics";
import type { IClickEvent } from "./types";

const collectionName = "clickEvents";
const RETENTION_SECONDS = 180 * 24 * 60 * 60; // 180 days

const ClickEventSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    slug: { type: String, required: true },
    channel: { type: String, required: true, enum: ["whatsapp", "instagram"] },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { collection: collectionName, versionKey: false },
);
// Automatic retention — no cron. TTL must be a single-field index.
ClickEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });
// Supports the day/channel trend aggregation.
ClickEventSchema.index({ createdAt: 1, channel: 1 });

export const ClickEvent: Model<IClickEvent> =
  (mongoose.models.ClickEvent as Model<IClickEvent>) ||
  mongoose.model<IClickEvent>("ClickEvent", ClickEventSchema);

export async function insertClickEventDB(input: {
  productId: string;
  slug: string;
  channel: TClickChannel;
  createdAt?: Date;
}): Promise<void> {
  await ClickEvent.create([
    {
      productId: input.productId,
      slug: input.slug,
      channel: input.channel,
      createdAt: input.createdAt ?? new Date(),
    },
  ]);
}

// Sparse daily counts (only days that have events), grouped by UTC day + channel.
export async function clicksByDayDB({ since }: { since: Date }): Promise<IClickDayRow[]> {
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    const rows = await ClickEvent.aggregate<IClickDayRow>([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
            channel: "$channel",
          },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, day: "$_id.day", channel: "$_id.channel", count: 1 } },
    ]);
    timer({
      operation: IOperationType.Read,
      collection: collectionName,
      method: "clicksByDayDB",
      success: "true",
    });
    return rows;
  } catch {
    timer({
      operation: IOperationType.Read,
      collection: collectionName,
      method: "clicksByDayDB",
      success: "false",
    });
    return [];
  }
}

export default ClickEvent;
export * from "./types";
