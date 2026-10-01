/**
 * How the favourites page is laid out, as a rule you can test without a
 * database. Its own module rather than a helper inside queries.ts, which is
 * server-only.
 *
 * Two decisions live here:
 *
 * Grouped by coffee, because that is the axis a favourite belongs to. The
 * same beans now carry several recipes — the V60 one, the moka one, the
 * three-cup one — and reading them under one heading is what makes the
 * difference between them legible. Flat, they would look like near-duplicate
 * cards.
 *
 * Brewable coffees first, spent ones last: the same order the coffee library
 * uses. A recipe whose every bag is finished is still worth keeping — that's
 * the point of writing it down — but it is not something you can make this
 * morning, so it does not get the top of the list.
 */

export type FavouriteRecipe = {
  coffeeId: string;
  coffeeName: string;
  roaster: string;
  /** Whether any bag of this coffee is still sealed or open. */
  brewable: boolean;
  /** ISO timestamp of when it was starred. */
  favouriteAt: string;
};

export type FavouriteGroup<T extends FavouriteRecipe> = {
  coffeeId: string;
  coffeeName: string;
  roaster: string;
  brewable: boolean;
  recipes: T[];
};

export function groupFavouritesByCoffee<T extends FavouriteRecipe>(
  favourites: T[],
): FavouriteGroup<T>[] {
  const groups = new Map<string, FavouriteGroup<T>>();

  for (const favourite of favourites) {
    let group = groups.get(favourite.coffeeId);
    if (!group) {
      group = {
        coffeeId: favourite.coffeeId,
        coffeeName: favourite.coffeeName,
        roaster: favourite.roaster,
        brewable: favourite.brewable,
        recipes: [],
      };
      groups.set(favourite.coffeeId, group);
    }
    group.recipes.push(favourite);
  }

  for (const group of groups.values()) {
    group.recipes.sort(byNewestStarFirst);
  }

  // A group is as recent as its most recent star, so a coffee you starred
  // something for today rises above one you last starred in March — and
  // sorting the recipes first is what makes recipes[0] that star.
  return [...groups.values()].sort((a, b) => {
    if (a.brewable !== b.brewable) return a.brewable ? -1 : 1;
    return byNewestStarFirst(a.recipes[0], b.recipes[0]);
  });
}

function byNewestStarFirst(a: FavouriteRecipe, b: FavouriteRecipe): number {
  return b.favouriteAt.localeCompare(a.favouriteAt);
}
