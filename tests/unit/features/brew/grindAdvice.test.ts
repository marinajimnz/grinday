import { describe, expect, it } from "vitest";
import { getGrindAdvice } from "@/features/brew/grindAdvice";

describe("getGrindAdvice", () => {
  it("says grind finer when an espresso runs fast", () => {
    expect(getGrindAdvice("espresso", 24000, 28000)).toEqual({
      verdict: "fast",
      amount: "little",
      actualSeconds: 24,
      targetSeconds: 28,
    });
  });

  it("reports the time rounded like the field that shows it", () => {
    expect(getGrindAdvice("espresso", 27449, 28000)?.actualSeconds).toBe(27.4);
  });

  it("says grind coarser when it runs slow", () => {
    expect(getGrindAdvice("espresso", 33000, 28000)?.verdict).toBe("slow");
  });

  it("asks for a bigger change when it missed by more than a quarter", () => {
    expect(getGrindAdvice("espresso", 18000, 28000)?.amount).toBe("lot");
    expect(getGrindAdvice("espresso", 36000, 28000)?.amount).toBe("lot");
  });

  it("leaves a shot within a couple of seconds alone", () => {
    expect(getGrindAdvice("espresso", 26000, 28000)?.verdict).toBe("onTarget");
    expect(getGrindAdvice("espresso", 30000, 28000)?.verdict).toBe("onTarget");
  });

  it("gives a pour-over more slack than an espresso", () => {
    // 15s off a 3:00 drawdown is within the pour's own wobble.
    expect(getGrindAdvice("v60", 195000, 180000)?.verdict).toBe("onTarget");
    expect(getGrindAdvice("chemex", 150000, 240000)?.verdict).toBe("fast");
  });

  it("stays quiet where the time is chosen, not caused by the grind", () => {
    expect(getGrindAdvice("prensa", 180000, 240000)).toBeNull();
    expect(getGrindAdvice("aeropress", 60000, 120000)).toBeNull();
    expect(getGrindAdvice("moka", 60000, 120000)).toBeNull();
  });

  it("needs both a time and a target", () => {
    expect(getGrindAdvice("espresso", null, 28000)).toBeNull();
    expect(getGrindAdvice("espresso", 24000, undefined)).toBeNull();
    expect(getGrindAdvice("espresso", 0, 28000)).toBeNull();
  });
});
