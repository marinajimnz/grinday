import { describe, expect, it } from "vitest";
import { pickTargetBag } from "@/features/attempts/brewTarget";

const bag = (id: string, status: string) => ({ id, status });

describe("pickTargetBag", () => {
  it("brews from the open bag", () => {
    expect(pickTargetBag([bag("a", "sealed"), bag("b", "open")])?.id).toBe("b");
  });

  it("falls back to a sealed one, which brewing then opens", () => {
    expect(pickTargetBag([bag("a", "finished"), bag("b", "sealed")])?.id).toBe("b");
  });

  it("offers nothing when every bag is finished or archived", () => {
    // The bug this replaced: the rule ended in "?? bags[0]", so a coffee
    // down to empty bags still showed up in the picker, pointing at one of
    // them.
    expect(pickTargetBag([bag("a", "finished"), bag("b", "archived")])).toBeUndefined();
  });

  it("offers nothing for a coffee with no bags", () => {
    expect(pickTargetBag([])).toBeUndefined();
  });
});
