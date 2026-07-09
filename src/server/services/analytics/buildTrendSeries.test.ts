import { describe, expect, it } from "vitest";
import type { IClickDayRow } from "@/server/validators/types";
import { buildTrendSeries } from "./buildTrendSeries";

const NOW = new Date("2026-07-09T12:00:00.000Z");

describe("buildTrendSeries", () => {
  it("produces one dense, ordered entry per day ending at `now` (UTC)", () => {
    const out = buildTrendSeries({ now: NOW, days: 7, rows: [] });
    expect(out.days).toBe(7);
    expect(out.series).toHaveLength(7);
    expect(out.series[0].date).toBe("2026-07-03");
    expect(out.series[6].date).toBe("2026-07-09");
    expect(out.series.every((p) => p.whatsapp === 0 && p.instagram === 0)).toBe(true);
    expect(out.totals).toEqual({ whatsapp: 0, instagram: 0 });
  });

  it("maps sparse rows onto the right days and sums totals", () => {
    const rows: IClickDayRow[] = [
      { day: "2026-07-09", channel: "whatsapp", count: 3 },
      { day: "2026-07-09", channel: "instagram", count: 1 },
      { day: "2026-07-07", channel: "whatsapp", count: 2 },
    ];
    const out = buildTrendSeries({ now: NOW, days: 7, rows });
    const last = out.series[6];
    expect(last).toEqual({ date: "2026-07-09", whatsapp: 3, instagram: 1 });
    expect(out.series.find((p) => p.date === "2026-07-07")).toEqual({
      date: "2026-07-07",
      whatsapp: 2,
      instagram: 0,
    });
    expect(out.totals).toEqual({ whatsapp: 5, instagram: 1 });
  });

  it("ignores rows outside the window", () => {
    const rows: IClickDayRow[] = [{ day: "2026-01-01", channel: "whatsapp", count: 9 }];
    const out = buildTrendSeries({ now: NOW, days: 7, rows });
    expect(out.totals).toEqual({ whatsapp: 0, instagram: 0 });
  });
});
