export const STATS_PERIODS = ["week", "month", "year"] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

export const DEFAULT_STATS_PERIOD: StatsPeriod = "year";

export function isStatsPeriod(value: string | undefined): value is StatsPeriod {
  return STATS_PERIODS.includes(value as StatsPeriod);
}

export type PeriodRange = {
  period: StatsPeriod;
  /** Inclusive, YYYY-MM-DD — the shape the SQL functions take. */
  from: string;
  to: string;
  /** What one bar covers. */
  bucket: "day" | "month";
  /** Every bar's start date in order, so the axis is drawn whole and the
   *  empty ones stay visible rather than collapsing the chart. */
  buckets: string[];
};

// Everything here is UTC, which is what `created_at::date` compares
// against in the SQL and what Vercel's clock runs on. The cost is that a
// brew logged between midnight and 02:00 Spanish time lands on the
// previous day's bar, and at the very edge of a period can fall outside
// it. Fixing that properly means carrying the browser's timezone to the
// server; it isn't worth the machinery until a 1 a.m. coffee happens.
function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utc(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

export function getPeriodRange(period: StatsPeriod, now: Date): PeriodRange {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  if (period === "year") {
    return {
      period,
      from: toISODate(utc(year, 0, 1)),
      to: toISODate(utc(year, 11, 31)),
      bucket: "month",
      buckets: Array.from({ length: 12 }, (_, i) => toISODate(utc(year, i, 1))),
    };
  }

  if (period === "month") {
    // Day 0 of the next month is the last day of this one.
    const days = utc(year, month + 1, 0).getUTCDate();
    return {
      period,
      from: toISODate(utc(year, month, 1)),
      to: toISODate(utc(year, month, days)),
      bucket: "day",
      buckets: Array.from({ length: days }, (_, i) => toISODate(utc(year, month, i + 1))),
    };
  }

  // The week runs Monday to Sunday, as it does in Spain — getUTCDay puts
  // Sunday at 0, so it needs pulling back six days rather than one.
  const weekday = now.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = utc(year, month, day + mondayOffset);
  return {
    period,
    from: toISODate(monday),
    to: toISODate(utc(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6)),
    bucket: "day",
    buckets: Array.from({ length: 7 }, (_, i) =>
      toISODate(utc(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i)),
    ),
  };
}
