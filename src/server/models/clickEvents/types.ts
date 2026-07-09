import type { TClickChannel } from "@/server/validators/types";

export interface IClickEvent {
  _id: string;
  productId: string;
  slug: string;
  channel: TClickChannel;
  createdAt: Date;
}
