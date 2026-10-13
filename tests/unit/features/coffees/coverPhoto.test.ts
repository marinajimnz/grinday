import { describe, expect, it } from "vitest";
import { pickCoverPhoto } from "@/features/coffees/cover";

const photo = (id: string, bag: string, created_at: string) => ({
  id,
  coffee_bag_id: bag,
  created_at,
});

describe("pickCoverPhoto", () => {
  it("uses the bag's own front photo, the oldest one if there are several", () => {
    const fronts = [
      photo("old-bag", "bag-1", "2026-01-01"),
      photo("own-later", "bag-2", "2026-03-01"),
      photo("own-first", "bag-2", "2026-02-01"),
    ];
    expect(pickCoverPhoto(fronts, "bag-2")?.id).toBe("own-first");
  });

  it("borrows the newest front photo from another bag when the bag has none", () => {
    const fronts = [
      photo("first-bag", "bag-1", "2026-01-01"),
      photo("second-bag", "bag-2", "2026-02-01"),
    ];
    expect(pickCoverPhoto(fronts, "bag-3")?.id).toBe("second-bag");
  });

  it("falls back to any bag when there's no bag to look from", () => {
    expect(pickCoverPhoto([photo("only", "bag-1", "2026-01-01")], undefined)?.id).toBe("only");
  });

  it("has nothing to pick when no bag of the coffee has a front photo", () => {
    expect(pickCoverPhoto([], "bag-1")).toBeUndefined();
  });
});
