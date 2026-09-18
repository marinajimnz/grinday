import { describe, expect, it } from "vitest";
import { formatDuration, formatElapsed } from "@/features/brew/formatTime";

describe("formatElapsed", () => {
  it("formats zero", () => {
    expect(formatElapsed(0)).toBe("00:00.0");
  });

  it("formats sub-minute durations with decisecond precision", () => {
    expect(formatElapsed(14_800)).toBe("00:14.8");
    expect(formatElapsed(29_950)).toBe("00:29.9");
  });

  it("rolls over into minutes", () => {
    expect(formatElapsed(65_000)).toBe("01:05.0");
    expect(formatElapsed(600_000)).toBe("10:00.0");
  });

  it("truncates instead of rounding up to the next decisecond", () => {
    expect(formatElapsed(14_899)).toBe("00:14.8");
  });
});

describe("formatDuration", () => {
  it("keeps the tenths a shot is measured in", () => {
    expect(formatDuration(28_800)).toBe("28.8 s");
    // The dashboard row used to round this to "0:25" and throw away the
    // precision the whole timer step exists to capture.
    expect(formatDuration(25_400)).toBe("25.4 s");
  });

  it("drops a trailing zero, the way a set target reads", () => {
    expect(formatDuration(27_000)).toBe("27 s");
    expect(formatDuration(0)).toBe("0 s");
  });

  it("switches to minutes where a brew is actually measured in them", () => {
    // Nobody reads a four-minute French press as "245.0 s".
    expect(formatDuration(245_000)).toBe("4:05");
    expect(formatDuration(60_000)).toBe("1:00");
  });

  it("never prints a sixtieth second", () => {
    // 59.97s rounds to 60.0 — that has to become 1:00, not "60 s".
    expect(formatDuration(59_970)).toBe("1:00");
    // ...and the same rounding at the top of a minute must not read "1:60".
    expect(formatDuration(119_970)).toBe("2:00");
  });
});
