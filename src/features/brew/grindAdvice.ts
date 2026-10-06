import { BREW_METHOD_CATEGORY, type BrewMethod } from "@/features/equipment/constants";
import type { BasketType } from "@/features/attempts/constants";
import { daysSinceRoast } from "@/features/coffees/roastAge";

export type GrindAdvice = {
  // "fast" → grind finer, "slow" → grind coarser.
  verdict: "fast" | "slow" | "onTarget";
  // "little" for a nudge, "lot" when it missed by more than a quarter.
  amount?: "little" | "lot";
  // Pressurized basket: the time is set mostly by the basket's own outlet,
  // so a fast or slow shot isn't a grind problem and "finer" won't fix it.
  pressurized?: boolean;
  actualSeconds: number;
  targetSeconds: number;
};

// How far from the target still counts as on it: whichever is larger, a
// fixed margin or a tenth of the target. Espresso is read to the second; a
// pour-over's drawdown wobbles by more than that with the pour alone.
const TOLERANCE: Partial<Record<(typeof BREW_METHOD_CATEGORY)[BrewMethod], { minMs: number; share: number }>> = {
  espresso_machine: { minMs: 2000, share: 0.1 },
  pour_over: { minMs: 15000, share: 0.1 },
};

// Past this share of the target, one click isn't going to be enough.
const BIG_MISS_SHARE = 0.25;

// Only where the clock is a result of the grind. On espresso and pour-over
// water runs through the bed, so a finer grind slows it down and a coarser
// one speeds it up. Immersion, moka and the rest stop when you decide —
// their time is part of the recipe, and says nothing about the grind.
export function getGrindAdvice(
  method: BrewMethod,
  extractionMs: number | null,
  targetTimeMs: number | undefined,
  basketType?: BasketType,
): GrindAdvice | null {
  const tolerance = TOLERANCE[BREW_METHOD_CATEGORY[method]];
  if (!tolerance || extractionMs == null || !targetTimeMs || extractionMs <= 0) return null;

  const diffMs = extractionMs - targetTimeMs;
  const allowedMs = Math.max(tolerance.minMs, targetTimeMs * tolerance.share);
  const base = {
    // Same rounding as the time field above it, so the card never says
    // 27 s next to a field that says 27.4s.
    actualSeconds: Math.round(extractionMs / 100) / 10,
    targetSeconds: Math.round(targetTimeMs / 1000),
  };
  if (Math.abs(diffMs) <= allowedMs) return { verdict: "onTarget", ...base };
  return {
    verdict: diffMs < 0 ? "fast" : "slow",
    amount: Math.abs(diffMs) > targetTimeMs * BIG_MISS_SHARE ? "lot" : "little",
    ...(basketType === "pressurized" && { pressurized: true }),
    ...base,
  };
}

// Past this, beans have lost much of the gas that builds resistance in a
// non-pressurized basket, and a pressurized one is a fair way to rescue them.
const STALE_AFTER_DAYS = 42;

/**
 * Whether to suggest the non-pressurized basket: a pressurized one chosen
 * by someone who grinds their own (a grinder in the recipe), for beans
 * that aren't stale. A pressurized basket is for pre-ground or tired
 * coffee; fresh beans ground on the spot do better without it, and only
 * then does the grind actually steer the shot. An unknown roast date
 * doesn't stop the suggestion — grinding at home is the stronger sign.
 */
export function shouldSuggestNonPressurized(recipe: {
  basketType?: BasketType;
  grinderId?: string;
  grinderModelName?: string;
}, roastDate: string | null | undefined, today?: string): boolean {
  if (recipe.basketType !== "pressurized") return false;
  if (!recipe.grinderId && !recipe.grinderModelName) return false;
  const days = daysSinceRoast(roastDate, today);
  return days === null || days <= STALE_AFTER_DAYS;
}
