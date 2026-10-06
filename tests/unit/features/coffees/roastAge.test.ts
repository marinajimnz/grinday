import { describe, expect, it } from "vitest";
import { daysSinceRoast, daysSinceRoastAt, formatRoastAge } from "@/features/coffees/roastAge";

describe("daysSinceRoast", () => {
  it("counts whole calendar days", () => {
    expect(daysSinceRoast("2026-09-24", "2026-10-06")).toBe(12);
    expect(daysSinceRoast("2026-10-06", "2026-10-06")).toBe(0);
  });

  it("isn't thrown by a clock change in between", () => {
    // Spain goes back an hour on 25 October 2026.
    expect(daysSinceRoast("2026-10-20", "2026-10-30")).toBe(10);
  });

  it("has nothing to say without a roast date, or with one still ahead", () => {
    expect(daysSinceRoast(null, "2026-10-06")).toBeNull();
    expect(daysSinceRoast(undefined, "2026-10-06")).toBeNull();
    expect(daysSinceRoast("2026-10-07", "2026-10-06")).toBeNull();
  });
});

describe("daysSinceRoastAt", () => {
  it("counts to the day the moment fell on in Madrid, not in UTC", () => {
    // 23:30 UTC on the 5th is already 01:30 on the 6th in Madrid.
    expect(daysSinceRoastAt("2026-09-24", "2026-10-05T23:30:00Z")).toBe(12);
  });
});

describe("formatRoastAge", () => {
  const labels = { today: "hoy", one: "hace 1 día", many: "hace {count} días" };

  it("picks the right form", () => {
    expect(formatRoastAge(0, labels)).toBe("hoy");
    expect(formatRoastAge(1, labels)).toBe("hace 1 día");
    expect(formatRoastAge(12, labels)).toBe("hace 12 días");
  });
});
