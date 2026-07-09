import type { IClickTrends } from "@/server/validators/types";
import { clicksByDayDB } from "../../models/clickEvents";
import { buildTrendSeries } from "./buildTrendSeries";

const VALID_DAYS = [7, 14, 30, 90];
const DEFAULT_DAYS = 30;

export default async function clickTrends({
  days,
  now,
}: {
  days?: number;
  now?: Date;
}): Promise<IClickTrends> {
  const window = VALID_DAYS.includes(days ?? DEFAULT_DAYS) ? (days as number) : DEFAULT_DAYS;
  const at = now ?? new Date();

  // Start of the earliest day in range, at 00:00 UTC.
  const since = new Date(at);
  since.setUTCDate(since.getUTCDate() - (window - 1));
  since.setUTCHours(0, 0, 0, 0);

  const rows = await clicksByDayDB({ since });
  return buildTrendSeries({ now: at, days: window, rows });
}
