import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDate, formatDateTime, formatRelativeDay } from "@/lib/i18n/format-date";

const LABELS = { today: "hoy", yesterday: "ayer" };

// Instants are written in UTC on purpose: what's on screen must follow the
// app's clock (Europe/Madrid, UTC+2 in summer, +1 in winter), not whichever
// zone the server or the test runner happens to be in.
describe("formatRelativeDay", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 6 October 2026, 12:00 in Madrid.
    vi.setSystemTime(new Date("2026-10-06T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("names today and yesterday instead of dating them", () => {
    expect(formatRelativeDay("2026-10-06T08:00:00Z", "es", LABELS)).toBe("hoy");
    expect(formatRelativeDay("2026-10-05T08:00:00Z", "es", LABELS)).toBe("ayer");
  });

  it("leaves the year off a brew from this year", () => {
    // Every row in an active journal says the same year, and the row has no
    // width to spare for it — see the note on the function.
    const formatted = formatRelativeDay("2026-09-06T10:00:00Z", "es", LABELS);
    expect(formatted).not.toMatch(/\d{4}/);
    expect(formatted).toMatch(/^06 /);
  });

  it("keeps the year once it actually distinguishes something", () => {
    expect(formatRelativeDay("2025-10-06T10:00:00Z", "es", LABELS)).toMatch("2025");
  });

  it("counts whole days on Madrid's calendar, not elapsed hours or UTC days", () => {
    // 00:05 today in Madrid is still the 5th in UTC — and it's "hoy".
    expect(formatRelativeDay("2026-10-05T22:05:00Z", "es", LABELS)).toBe("hoy");
    // 23:55 yesterday in Madrid is barely older, and it's "ayer".
    expect(formatRelativeDay("2026-10-05T21:55:00Z", "es", LABELS)).toBe("ayer");
  });
});

describe("formatDateTime and formatDate", () => {
  it("show Madrid's time, whatever the machine's zone", () => {
    expect(formatDateTime("2026-10-04T10:00:00Z", "es")).toBe("4/10/2026, 12:00:00");
  });

  it("put a late-night brew on the day it was in Madrid", () => {
    // 23:30 UTC on the 5th is 01:30 on the 6th in Madrid.
    expect(formatDate("2026-10-05T23:30:00Z", "es")).toMatch(/^06 /);
  });

  it("keep a bare date on its own day", () => {
    expect(formatDate("2026-09-24", "es")).toMatch(/^24 /);
  });
});
