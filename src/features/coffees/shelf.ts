import { hasBrewableBag } from "./brewable";

/**
 * How many paper tints a bag on the shelf can be printed in. Each one is a
 * pair of CSS variables in globals.css (--bag-tint-1 … --bag-tint-5), light
 * and dark.
 */
export const BAG_TINT_COUNT = 5;

/**
 * Which tint a coffee's bag is printed in, from 1 to BAG_TINT_COUNT.
 * Derived from the id rather than stored, so a coffee keeps the same colour
 * every time the shelf is drawn, wherever it ends up in the order.
 */
export function bagTintFor(coffeeId: string): number {
  let hash = 0;
  for (let i = 0; i < coffeeId.length; i++) {
    hash = (hash * 31 + coffeeId.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % BAG_TINT_COUNT) + 1;
}

/**
 * How many of the three beans on the label are filled in for a roast
 * level. Null for a level the beans can't express ("custom", or nothing
 * set), where the label says the level in words only.
 */
export function roastBeans(roastLevel: string | null): number | null {
  if (roastLevel === "light") return 1;
  if (roastLevel === "medium") return 2;
  if (roastLevel === "dark") return 3;
  return null;
}

/** The bag whose status the label shows: the open one, else the first. */
export function activeBag<B extends { status: string }>(bags: B[]): B | null {
  return bags.find((b) => b.status === "open") ?? bags[0] ?? null;
}

/**
 * What the header under "Cafés" counts: the coffees on the shelf, and the
 * bags among them that still have coffee in them. A finished bag is history,
 * not something sitting on the shelf.
 */
export function shelfCounts(coffees: { bags: { status: string }[] }[]): {
  coffees: number;
  bags: number;
} {
  let bags = 0;
  for (const coffee of coffees) {
    bags += coffee.bags.filter((b) => hasBrewableBag({ bags: [b] })).length;
  }
  return { coffees: coffees.length, bags };
}

/**
 * Where a drag of `dx` pixels lands, starting from `index`, with bags
 * `step` pixels apart. A short flick still moves one bag, so a swipe never
 * springs back to where it started.
 */
export function indexAfterSwipe(
  index: number,
  dx: number,
  step: number,
  length: number,
  threshold = 30,
): number {
  if (Math.abs(dx) <= threshold) return index;
  let steps = Math.round(dx / step);
  if (steps === 0) steps = Math.sign(dx);
  return Math.max(0, Math.min(length - 1, index - steps));
}
