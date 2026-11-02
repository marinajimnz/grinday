import { describe, expect, it } from "vitest";
import {
  BAG_TINT_COUNT,
  activeBag,
  bagTintFor,
  indexAfterSwipe,
  roastBeans,
  shelfCounts,
} from "@/features/coffees/shelf";

describe("bagTintFor", () => {
  it("gives a coffee the same tint every time, within range", () => {
    const id = "6f1c2a7e-3b0d-4b8e-9f51-0c8d7a1e2b34";
    expect(bagTintFor(id)).toBe(bagTintFor(id));
    for (const sample of [id, "a", "", "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"]) {
      const tint = bagTintFor(sample);
      expect(tint).toBeGreaterThanOrEqual(1);
      expect(tint).toBeLessThanOrEqual(BAG_TINT_COUNT);
    }
  });
});

describe("roastBeans", () => {
  it("fills one bean per step of roast, none for a level beans can't show", () => {
    expect(roastBeans("light")).toBe(1);
    expect(roastBeans("medium")).toBe(2);
    expect(roastBeans("dark")).toBe(3);
    expect(roastBeans("custom")).toBeNull();
    expect(roastBeans(null)).toBeNull();
  });
});

describe("activeBag", () => {
  it("prefers the open bag, else the first, else none", () => {
    expect(activeBag([{ status: "sealed" }, { status: "open" }])).toEqual({ status: "open" });
    expect(activeBag([{ status: "finished" }, { status: "sealed" }])).toEqual({ status: "finished" });
    expect(activeBag([])).toBeNull();
  });
});

describe("shelfCounts", () => {
  it("counts every coffee but only the bags still holding coffee", () => {
    expect(
      shelfCounts([
        { bags: [{ status: "open" }, { status: "sealed" }] },
        { bags: [{ status: "finished" }] },
        { bags: [] },
      ]),
    ).toEqual({ coffees: 3, bags: 2 });
  });
});

describe("indexAfterSwipe", () => {
  it("stays put for a nudge, moves one bag for a flick, more for a long drag", () => {
    expect(indexAfterSwipe(2, 20, 168, 5)).toBe(2);
    expect(indexAfterSwipe(2, -40, 168, 5)).toBe(3);
    expect(indexAfterSwipe(2, 40, 168, 5)).toBe(1);
    expect(indexAfterSwipe(2, -340, 168, 5)).toBe(4);
  });

  it("never runs off either end of the shelf", () => {
    expect(indexAfterSwipe(0, 400, 168, 5)).toBe(0);
    expect(indexAfterSwipe(4, -400, 168, 5)).toBe(4);
  });
});
