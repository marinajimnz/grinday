import { describe, expect, it } from "vitest";
import { suggestHandle } from "@/features/profile/handle";

describe("suggestHandle", () => {
  it("turns a display name into a valid handle", () => {
    expect(suggestHandle("Lucía V60")).toBe("lucia_v60");
    expect(suggestHandle("  Marina  ")).toBe("marina");
    expect(suggestHandle("Café Nómada!!")).toBe("cafe_nomada");
  });

  it("cuts long names to 30 characters without a trailing underscore", () => {
    const handle = suggestHandle("La Semilla Coffee Roasters de Granada");
    expect(handle.length).toBeLessThanOrEqual(30);
    expect(handle.endsWith("_")).toBe(false);
  });

  it("suggests nothing when the name can't make a valid handle", () => {
    expect(suggestHandle("Jo")).toBe("");
    expect(suggestHandle("☕☕☕")).toBe("");
    expect(suggestHandle(null)).toBe("");
  });
});
