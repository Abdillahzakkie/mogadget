import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { connectThrowawayDB, dropThrowawayDB } from "../../../test/throwawayDb";
import { connectRedis, redis } from "../../databases/redis";
import { ClickEvent } from "../../models/clickEvents";
import { createProductDB } from "../../models/products";
import incrementClick from "./incrementClick";

const base = {
  name: "ClickEvt Phone",
  category: "PHONES",
  brand: "iPhone",
  condition: "NEW",
  cosmeticGrade: null,
  priceNaira: 500000,
  stockType: "RESTOCKABLE",
  status: "IN_STOCK",
  quantity: 5,
  description: null,
  images: [],
  specs: [],
} as const;

describe("incrementClick — click-event write path", () => {
  beforeAll(async () => {
    await connectThrowawayDB("clickevents-write");
    await connectRedis();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  afterAll(async () => {
    await redis.quit();
    await dropThrowawayDB();
  });

  it("increments the counter AND records a timestamped ClickEvent", async () => {
    const doc = await createProductDB({ ...base, slug: "clickevt-a" } as never);
    const slug = doc!.slug;

    expect(await incrementClick({ slug, channel: "whatsapp" })).toBe(true);

    const events = await ClickEvent.find({ slug }).lean();
    expect(events).toHaveLength(1);
    expect(events[0].channel).toBe("whatsapp");
    expect(String(events[0].productId)).toBe(String(doc!._id));
  });

  it("still succeeds when the event insert fails (never regress the click)", async () => {
    const doc = await createProductDB({ ...base, name: "ClickEvt B", slug: "clickevt-b" } as never);
    const slug = doc!.slug;
    vi.spyOn(ClickEvent, "create").mockRejectedValueOnce(new Error("boom"));

    expect(await incrementClick({ slug, channel: "instagram" })).toBe(true);

    // Counter still moved; no event stored for this click.
    expect(await ClickEvent.countDocuments({ slug })).toBe(0);
  });

  it("returns false for an unknown slug and stores no event", async () => {
    expect(await incrementClick({ slug: "nope-missing", channel: "whatsapp" })).toBe(false);
    expect(await ClickEvent.countDocuments({ slug: "nope-missing" })).toBe(0);
  });
});
