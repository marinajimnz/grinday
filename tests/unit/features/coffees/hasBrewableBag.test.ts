import { describe, expect, it } from "vitest";
import { hasBrewableBag } from "@/features/coffees/brewable";

const bag = (status: string) => ({ status });

describe("hasBrewableBag", () => {
  it("counts a sealed bag and an open one", () => {
    expect(hasBrewableBag({ bags: [bag("sealed")] })).toBe(true);
    expect(hasBrewableBag({ bags: [bag("open")] })).toBe(true);
  });

  it("does not count a finished or archived one", () => {
    expect(hasBrewableBag({ bags: [bag("finished")] })).toBe(false);
    expect(hasBrewableBag({ bags: [bag("archived")] })).toBe(false);
    expect(hasBrewableBag({ bags: [bag("finished"), bag("archived")] })).toBe(false);
  });

  it("is true while one bag of several is still brewable", () => {
    expect(hasBrewableBag({ bags: [bag("finished"), bag("open")] })).toBe(true);
  });

  it("is false for a coffee with no bags at all", () => {
    // Nothing to brew is nothing to brew, however it got that way — and a
    // coffee you never bought shouldn't lead the library either.
    expect(hasBrewableBag({ bags: [] })).toBe(false);
  });
});
