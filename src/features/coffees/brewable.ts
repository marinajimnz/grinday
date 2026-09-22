/**
 * Sealed or open: a bag there is still coffee to take out of.
 *
 * Its own module rather than a helper inside queries.ts, which is
 * server-only — this is a plain rule about a status, and the rule is worth
 * testing on its own.
 */
export function hasBrewableBag(coffee: { bags: { status: string }[] }): boolean {
  return coffee.bags.some((bag) => bag.status === "sealed" || bag.status === "open");
}
