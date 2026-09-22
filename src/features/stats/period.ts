import { APP_TIME_ZONE, todayParts } from "@/lib/time";

export const STATS_PERIODS = ["week", "month", "year"] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

// The week is what you can still act on: a year opens on a number you
// can only look at, a week opens on the one you are still filling.
export const DEFAULT_STATS_PERIOD: StatsPeriod = "week";

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

/**
 * Passed to the SQL on every call, so a period's boundaries and the bars
 * inside it are read off the same clock. It is the app's one zone (see
 * lib/time), not a second opinion about what day it is.
 */
export const STATS_TIME_ZONE = APP_TIME_ZONE;

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Calendar arithmetic only. Once a Y/M/D has been read off the clock in
// the right zone, a UTC Date is just a convenient way to add days and
// roll over month ends — it is never turned back into an instant, so no
// offset can creep in.
function utc(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

export function getPeriodRange(
  period: StatsPeriod,
  now: Date,
  timeZone: string = STATS_TIME_ZONE,
): PeriodRange {
  const { year, month, day } = todayParts(timeZone, now);

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

  // The week runs Monday to Sunday, as it does in Spain. getUTCDay on a
  // date built from the local Y/M/D gives that date's weekday, and it
  // puts Sunday at 0 — so Sunday needs pulling back six days, not one.
  const weekday = utc(year, month, day).getUTCDay();
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
