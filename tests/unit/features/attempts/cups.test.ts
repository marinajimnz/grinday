import { describe, expect, it } from "vitest";
import { cupsForAttempt, sumCups } from "@/features/attempts/cups";

describe("cupsForAttempt", () => {
  it("takes the recorded number when there is one", () => {
    expect(cupsForAttempt({ cup_count: 2 })).toBe(2);
  });

  it("reads a moka pot's size as its cup count", () => {
    // A moka pot has no separate "how many cups" question: its size is
    // the answer, which is why the guided flow doesn't ask twice.
    expect(cupsForAttempt({ cup_count: null, moka_cup_size: 6 })).toBe(6);
  });

  it("prefers the recorded number over the pot's size", () => {
    expect(cupsForAttempt({ cup_count: 1, moka_cup_size: 6 })).toBe(1);
  });

  it("counts an attempt older than the column as one cup", () => {
    // Twenty-five attempts predate cup_count. They were still coffees.
    expect(cupsForAttempt({})).toBe(1);
    expect(cupsForAttempt({ cup_count: null, moka_cup_size: null })).toBe(1);
  });

  it("adds a mixed bag up", () => {
    expect(sumCups([{ cup_count: 2 }, { moka_cup_size: 3 }, {}])).toBe(6);
  });

  it("is zero for a bag nothing was brewed from", () => {
    expect(sumCups([])).toBe(0);
  });
});
