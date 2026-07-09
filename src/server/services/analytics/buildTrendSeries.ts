import type { IClickDayRow, IClickTrends, ITrendPoint } from "@/server/validators/types";

function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Pure, deterministic. Given the sparse per-day rows and the reference `now`, emit a dense,
// chronologically-ordered series of `days` entries ending on `now`'s UTC day, zero-filled,
// with channel totals over the window.
export function buildTrendSeries({
  now,
  days,
  rows,
}: {
  now: Date;
  days: number;
  rows: IClickDayRow[];
}): IClickTrends {
  const key = (day: string, ch: string) => `${day}|${ch}`;
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(key(r.day, r.channel), r.count);

  const series: ITrendPoint[] = [];
  let whatsapp = 0;
  let instagram = 0;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const date = utcDay(d);
    const wa = counts.get(key(date, "whatsapp")) ?? 0;
    const ig = counts.get(key(date, "instagram")) ?? 0;
    whatsapp += wa;
    instagram += ig;
    series.push({ date, whatsapp: wa, instagram: ig });
  }
  return { days, series, totals: { whatsapp, instagram } };
}
