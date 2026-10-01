import { describe, expect, it } from "vitest";
import { groupFavouritesByCoffee } from "@/features/attempts/favourites";

type Fav = {
  coffeeId: string;
  coffeeName: string;
  roaster: string;
  brewable: boolean;
  favouriteAt: string;
  label: string;
};

function fav(partial: Partial<Fav> & { label: string }): Fav {
  return {
    coffeeId: "guji",
    coffeeName: "Guji",
    roaster: "Nomad",
    brewable: true,
    favouriteAt: "2026-09-01T10:00:00.000Z",
    ...partial,
  };
}

describe("groupFavouritesByCoffee", () => {
  it("puts several recipes for the same coffee under one heading", () => {
    const groups = groupFavouritesByCoffee([
      fav({ label: "v60" }),
      fav({ label: "moka", favouriteAt: "2026-09-02T10:00:00.000Z" }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].coffeeName).toBe("Guji");
    expect(groups[0].recipes.map((r) => r.label)).toEqual(["moka", "v60"]);
  });

  it("orders the recipes inside a coffee by newest star first", () => {
    const groups = groupFavouritesByCoffee([
      fav({ label: "old", favouriteAt: "2026-01-01T00:00:00.000Z" }),
      fav({ label: "new", favouriteAt: "2026-09-30T00:00:00.000Z" }),
      fav({ label: "middle", favouriteAt: "2026-05-05T00:00:00.000Z" }),
    ]);

    expect(groups[0].recipes.map((r) => r.label)).toEqual(["new", "middle", "old"]);
  });

  it("sends coffees with nothing left to brew to the end, however recently starred", () => {
    const groups = groupFavouritesByCoffee([
      fav({
        coffeeId: "spent",
        coffeeName: "Spent",
        brewable: false,
        // Starred today, and still last: you cannot make it this morning.
        favouriteAt: "2026-09-30T00:00:00.000Z",
        label: "spent",
      }),
      fav({
        coffeeId: "open",
        coffeeName: "Open",
        favouriteAt: "2026-02-02T00:00:00.000Z",
        label: "open",
      }),
    ]);

    expect(groups.map((g) => g.coffeeName)).toEqual(["Open", "Spent"]);
  });

  it("ranks a coffee by its most recent star, not by whichever row came first", () => {
    const groups = groupFavouritesByCoffee([
      fav({ coffeeId: "a", coffeeName: "A", favouriteAt: "2026-03-01T00:00:00.000Z", label: "a-old" }),
      fav({ coffeeId: "b", coffeeName: "B", favouriteAt: "2026-04-01T00:00:00.000Z", label: "b" }),
      fav({ coffeeId: "a", coffeeName: "A", favouriteAt: "2026-05-01T00:00:00.000Z", label: "a-new" }),
    ]);

    expect(groups.map((g) => g.coffeeName)).toEqual(["A", "B"]);
  });

  it("has nothing to group when nothing is starred", () => {
    expect(groupFavouritesByCoffee([])).toEqual([]);
  });
});
