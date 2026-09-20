import { describe, expect, it } from "vitest";
import { getPeriodRange, isStatsPeriod } from "@/features/stats/period";

// A Wednesday, in a 30-day month, in a leap year — so the week straddles
// nothing, the month length isn't 31, and February is available to check.
const WEDNESDAY = new Date("2026-09-16T10:00:00.000Z");

describe("getPeriodRange", () => {
  it("runs the week Monday to Sunday, as Spain reads a calendar", () => {
    const range = getPeriodRange("week", WEDNESDAY);
    expect(range.from).toBe("2026-09-14");
    expect(range.to).toBe("2026-09-20");
    expect(range.bucket).toBe("day");
    expect(range.buckets).toHaveLength(7);
    expect(range.buckets[0]).toBe("2026-09-14");
    expect(range.buckets[6]).toBe("2026-09-20");
  });

  it("pulls Sunday back to the week it ends, not the one it starts", () => {
    // getUTCDay calls Sunday 0, so the naive `1 - weekday` jumps forward a
    // day instead of back six, and a Sunday brew lands in next week.
    const sundayAfternoon = new Date("2026-09-20T12:00:00.000Z");
    expect(getPeriodRange("week", sundayAfternoon).from).toBe("2026-09-14");
    expect(getPeriodRange("week", sundayAfternoon).to).toBe("2026-09-20");
  });

  it("reads the clock in Madrid, not in UTC", () => {
    // 23:00 UTC on Sunday is 01:00 on Monday in Spain, and Monday starts a
    // new week. Under UTC this instant reported the week that had just
    // ended, which is the whole reason the zone is threaded through.
    const mondayNight = new Date("2026-09-20T23:00:00.000Z");
    expect(getPeriodRange("week", mondayNight).from).toBe("2026-09-21");
    expect(getPeriodRange("week", mondayNight).to).toBe("2026-09-27");

    // And it follows summer time: the same wall clock in January is only
    // one hour ahead, so 23:00 UTC is still the same day.
    const januaryNight = new Date("2026-01-14T23:00:00.000Z");
    expect(getPeriodRange("month", januaryNight).from).toBe("2026-01-01");
    expect(getPeriodRange("year", januaryNight).from).toBe("2026-01-01");
    expect(getPeriodRange("week", januaryNight).from).toBe("2026-01-12");
  });

  it("rolls the year over at Spanish midnight, not at UTC midnight", () => {
    // 23:30 on 31 December in UTC is already 00:30 on 1 January in Spain.
    const newYear = new Date("2026-12-31T23:30:00.000Z");
    expect(getPeriodRange("year", newYear).from).toBe("2027-01-01");
    expect(getPeriodRange("year", newYear).to).toBe("2027-12-31");
  });

  it("carries the week across a month boundary", () => {
    const thursday = new Date("2026-10-01T08:00:00.000Z");
    const range = getPeriodRange("week", thursday);
    expect(range.from).toBe("2026-09-28");
    expect(range.to).toBe("2026-10-04");
    expect(range.buckets).toHaveLength(7);
  });

  it("gives the month as many bars as it has days", () => {
    const range = getPeriodRange("month", WEDNESDAY);
    expect(range.from).toBe("2026-09-01");
    expect(range.to).toBe("2026-09-30");
    expect(range.buckets).toHaveLength(30);

    const feb = getPeriodRange("month", new Date("2024-02-10T00:00:00.000Z"));
    expect(feb.to).toBe("2024-02-29");
    expect(feb.buckets).toHaveLength(29);
  });

  it("gives the year twelve months", () => {
    const range = getPeriodRange("year", WEDNESDAY);
    expect(range.from).toBe("2026-01-01");
    expect(range.to).toBe("2026-12-31");
    expect(range.bucket).toBe("month");
    expect(range.buckets).toHaveLength(12);
    expect(range.buckets[0]).toBe("2026-01-01");
    expect(range.buckets[11]).toBe("2026-12-01");
  });

  it("keeps every bucket inside the range it belongs to", () => {
    for (const period of ["week", "month", "year"] as const) {
      const range = getPeriodRange(period, WEDNESDAY);
      for (const bucket of range.buckets) {
        expect(bucket >= range.from).toBe(true);
        expect(bucket <= range.to).toBe(true);
      }
    }
  });
});

describe("isStatsPeriod", () => {
  it("rejects anything that isn't one of the three", () => {
    // It guards a URL parameter, so "?period=<script>" has to fall back.
    expect(isStatsPeriod("week")).toBe(true);
    expect(isStatsPeriod("decade")).toBe(false);
    expect(isStatsPeriod(undefined)).toBe(false);
  });
});
