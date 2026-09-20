import { cn } from "@/lib/cn";
import { IconCafe, IconFlecha, IconGrano, IconPreparar } from "@/components/icons/pencil-icons";
import { computeRatios, formatRatio, getRecipeFieldConfig } from "@/features/brew/recipeFieldConfig";
import { formatDuration } from "@/features/brew/formatTime";
import type { BrewMethod } from "@/features/equipment/constants";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

/**
 * What a brew was, in one line: how many cups, how much coffee for what
 * ratio, and how long it ran.
 *
 * Takes `dict` rather than calling useDictionary because both callers need
 * it and they sit on opposite sides of the server/client line — the
 * dashboard's recipe card is a Server Component, the attempt row is not.
 */
export type BrewSummaryAttempt = {
  method: string | null;
  cup_count?: number | null;
  dose_g: number | null;
  water_g: number | null;
  dilution_water_g?: number | null;
  target_weight_g: number | null;
  output_weight_g?: number | null;
  extraction_ms: number | null;
};

export function BrewSummary({
  attempt,
  dict,
  size = "sm",
  className,
}: {
  attempt: BrewSummaryAttempt;
  dict: Dictionary;
  size?: "sm" | "lg";
  className?: string;
}) {
  const method = (attempt.method as BrewMethod) ?? "espresso";
  const config = getRecipeFieldConfig(method);
  // What actually landed in the cup, falling back to what was aimed for —
  // the same fallback the attempt page uses, so one brew doesn't read as
  // two different ratios depending on which screen you're looking at.
  const { ratio } = computeRatios(config, {
    doseG: attempt.dose_g,
    waterG: attempt.water_g,
    dilutionWaterG: attempt.dilution_water_g,
    brewWeightG: attempt.output_weight_g ?? attempt.target_weight_g,
  });

  const big = size === "lg";
  const text = big ? "text-xl font-semibold text-ink" : "text-sm text-ink-muted";
  const icon = big ? "size-5" : "size-3.5";

  const cups = attempt.cup_count != null && (
    <>
      <span className="sr-only">{dict.brew.cupCount}</span>
      <IconCafe aria-hidden className={icon} />
      <span className="tabular-nums">{attempt.cup_count}</span>
    </>
  );

  const dose = attempt.dose_g != null && (
    <>
      <span className="sr-only">{dict.dashboard.dose}</span>
      <IconGrano aria-hidden className={icon} />
      <span className="tabular-nums">{attempt.dose_g} g</span>
      {ratio !== undefined && (
        <>
          <IconFlecha aria-hidden className={cn(icon, "text-ink-muted")} />
          <span className="sr-only">{dict.brew.ratio}</span>
          <span className="tabular-nums">{formatRatio(ratio)}</span>
        </>
      )}
    </>
  );

  const time = attempt.extraction_ms != null && (
    <>
      <span className="sr-only">{dict.dashboard.extraction}</span>
      <IconPreparar aria-hidden className={icon} />
      <span className="tabular-nums">{formatDuration(attempt.extraction_ms)}</span>
    </>
  );

  if (!cups && !dose && !time) {
    return <p className={cn("text-sm text-ink-muted", className)}>{dict.dashboard.noRecipeData}</p>;
  }

  const cell = "inline-flex items-center gap-1 whitespace-nowrap";

  // justify-between over three cells, rather than three equal thirds: the
  // free space splits evenly into the two gaps, so the clock sits against
  // the left edge and the cups against the right with the dose the same
  // distance from each — thirds put it in the middle of the box instead,
  // which is only the middle of the gaps when the two outer groups happen
  // to be the same width, and they never are.
  //
  // All three cells render even when empty, so a brew with no cup count —
  // every method but espresso, and every attempt logged before the column
  // existed — keeps the other two where they were instead of sliding out
  // to the edges.
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-input bg-canvas px-3",
        big ? "py-2.5" : "py-1.5",
        text,
        className,
      )}
    >
      <span className={cell}>{time}</span>
      <span className={cell}>{dose}</span>
      <span className={cell}>{cups}</span>
    </div>
  );
}
