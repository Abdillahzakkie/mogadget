import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clicksByDayDB, insertClickEventDB } from "../../models/clickEvents";
import { connectThrowawayDB, dropThrowawayDB } from "../../../test/throwawayDb";

const PID = "0123456789abcdef01234567";

describe("clickEvents aggregation + clickTrends service", () => {
  beforeAll(async () => {
    await connectThrowawayDB("clicktrends");
  });
  afterAll(async () => {
    await dropThrowawayDB();
  });

  it("clicksByDayDB groups events by UTC day and channel", async () => {
    const d1 = new Date("2026-06-01T10:00:00.000Z");
    const d2 = new Date("2026-06-01T23:30:00.000Z");
    const d3 = new Date("2026-06-02T00:30:00.000Z");
    await insertClickEventDB({ productId: PID, slug: "a", channel: "whatsapp", createdAt: d1 });
    await insertClickEventDB({ productId: PID, slug: "a", channel: "whatsapp", createdAt: d2 });
    await insertClickEventDB({ productId: PID, slug: "a", channel: "instagram", createdAt: d1 });
    await insertClickEventDB({ productId: PID, slug: "a", channel: "whatsapp", createdAt: d3 });

    const rows = await clicksByDayDB({ since: new Date("2026-06-01T00:00:00.000Z") });
    const find = (day: string, ch: string) =>
      rows.find((r) => r.day === day && r.channel === ch)?.count ?? 0;

    expect(find("2026-06-01", "whatsapp")).toBe(2);
    expect(find("2026-06-01", "instagram")).toBe(1);
    expect(find("2026-06-02", "whatsapp")).toBe(1);
  });

  it("clicksByDayDB excludes events before `since`", async () => {
    const rows = await clicksByDayDB({ since: new Date("2026-06-02T00:00:00.000Z") });
    expect(rows.every((r) => r.day >= "2026-06-02")).toBe(true);
  });
});
