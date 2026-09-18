import { describe, expect, it } from "vitest";
import { formatRelativeDay } from "@/lib/i18n/format-date";

const LABELS = { today: "hoy", yesterday: "ayer" };
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

describe("formatRelativeDay", () => {
  it("names today and yesterday instead of dating them", () => {
    expect(formatRelativeDay(new Date(), "es", LABELS)).toBe("hoy");
    expect(formatRelativeDay(daysAgo(1), "es", LABELS)).toBe("ayer");
  });

  it("leaves the year off a brew from this year", () => {
    // Every row in an active journal says the same year, and the row has no
    // width to spare for it — see the note on the function.
    const formatted = formatRelativeDay(daysAgo(30), "es", LABELS);
    expect(formatted).not.toMatch(/\d{4}/);
    expect(formatted).toMatch(/^\d{2} /);
  });

  it("keeps the year once it actually distinguishes something", () => {
    const old = new Date();
    old.setFullYear(old.getFullYear() - 1);
    expect(formatRelativeDay(old, "es", LABELS)).toMatch(String(old.getFullYear()));
  });

  it("counts whole days, not elapsed hours", () => {
    // 00:05 today is "hoy" even though it is minutes old, and 23:55
    // yesterday is "ayer" even though it is barely older.
    const justAfterMidnight = new Date();
    justAfterMidnight.setHours(0, 5, 0, 0);
    expect(formatRelativeDay(justAfterMidnight, "es", LABELS)).toBe("hoy");

    const lateYesterday = daysAgo(1);
    lateYesterday.setHours(23, 55, 0, 0);
    expect(formatRelativeDay(lateYesterday, "es", LABELS)).toBe("ayer");
  });
});
