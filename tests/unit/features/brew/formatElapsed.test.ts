import { describe, expect, it } from "vitest";
import { formatElapsed } from "@/features/brew/formatElapsed";

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
