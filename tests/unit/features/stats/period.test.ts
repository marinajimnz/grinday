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
    const sunday = new Date("2026-09-20T23:00:00.000Z");
    expect(getPeriodRange("week", sunday).from).toBe("2026-09-14");
    expect(getPeriodRange("week", sunday).to).toBe("2026-09-20");
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
