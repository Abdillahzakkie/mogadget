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

  it("clickTrends clamps invalid windows to 30 days", async () => {
    const { default: clickTrends } = await import("./clickTrends");
    const now = new Date("2026-06-10T12:00:00.000Z");
    const out = await clickTrends({ days: 999, now });
    expect(out.days).toBe(30);
    expect(out.series).toHaveLength(30);
  });

  it("clickTrends returns dense series with totals from stored events", async () => {
    const { default: clickTrends } = await import("./clickTrends");
    const now = new Date("2026-06-02T12:00:00.000Z");
    // Events from Task 1 are on 2026-06-01 (2 wa, 1 ig) and 2026-06-02 (1 wa).
    const out = await clickTrends({ days: 7, now });
    expect(out.series).toHaveLength(7);
    expect(out.series[out.series.length - 1].date).toBe("2026-06-02");
    expect(out.totals.whatsapp).toBe(3);
    expect(out.totals.instagram).toBe(1);
  });
});
