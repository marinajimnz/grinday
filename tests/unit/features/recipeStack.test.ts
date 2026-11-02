import { describe, expect, it } from "vitest";
import { buildRecipeStack, stackIndexAfter } from "@/features/dashboard/recipeStack";

const a = (id: string) => ({ id });

describe("buildRecipeStack", () => {
  it("orders the pinned recipe, the last attempt and the week's best", () => {
    const stack = buildRecipeStack({ preferred: a("p"), last: a("l"), best: a("b") });
    expect(stack.map((c) => [c.kind, c.attempt.id])).toEqual([
      ["preferred", "p"],
      ["last", "l"],
      ["best", "b"],
    ]);
  });

  it("shows an attempt once, as the first thing it is", () => {
    // The last brew is often the best one too, and often the pinned one.
    expect(buildRecipeStack({ preferred: null, last: a("x"), best: a("x") }).map((c) => c.kind)).toEqual([
      "last",
    ]);
    expect(buildRecipeStack({ preferred: a("x"), last: a("x"), best: a("y") }).map((c) => c.kind)).toEqual([
      "preferred",
      "best",
    ]);
  });

  it("is empty with nothing brewed yet", () => {
    expect(buildRecipeStack({ preferred: null, last: null, best: null })).toEqual([]);
  });
});

describe("stackIndexAfter", () => {
  it("wraps around both ends of the pile", () => {
    expect(stackIndexAfter(0, 1, 4)).toBe(1);
    expect(stackIndexAfter(3, 1, 4)).toBe(0);
    expect(stackIndexAfter(0, -1, 4)).toBe(3);
    // Depth of card 1 when card 3 is on top.
    expect(stackIndexAfter(1, -3, 4)).toBe(2);
  });

  it("stays at 0 for an empty pile", () => {
    expect(stackIndexAfter(0, 1, 0)).toBe(0);
  });
});
