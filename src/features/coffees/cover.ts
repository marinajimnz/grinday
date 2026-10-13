/**
 * Which "package_front" photo stands for a coffee, seen from one of its bags.
 *
 * Photos are stored per bag (coffee_media.coffee_bag_id), but what they show
 * is the coffee — and a new bag of a coffee you've bought before is the same
 * package. So the bag's own front shot wins, and when it has none the coffee
 * borrows the newest one from any of its other bags, rather than a fresh bag
 * wiping the coffee's face off the library, the brew picker and its gallery.
 *
 * `fronts` are the package_front rows of a single coffee, in any order. Its
 * own module rather than a helper inside queries.ts, which is server-only.
 */
export function pickCoverPhoto<T extends { coffee_bag_id: string; created_at: string }>(
  fronts: T[],
  bagId: string | undefined,
): T | undefined {
  const byAge = [...fronts].sort((a, b) => a.created_at.localeCompare(b.created_at));
  // Oldest first on the bag itself: same pick as before this fallback existed.
  const own = byAge.find((m) => m.coffee_bag_id === bagId);
  if (own) return own;
  // Newest first from the others: the most recent package is the likeliest
  // to look like the one on the counter.
  return byAge.reverse().find((m) => m.coffee_bag_id !== bagId);
}
