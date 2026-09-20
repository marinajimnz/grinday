"use client";

import { cn } from "@/lib/cn";
import { SteppableFieldGrid, type SteppableField } from "./SteppableFieldGrid";
import { SettingsAccordionCard } from "@/components/settings/SettingsAccordionCard";
import { computeRatios, getRecipeFieldConfig, formatRatio } from "@/features/brew/recipeFieldConfig";
import { CUP_COUNTS, HEAT_INTENSITIES, MAX_CUP_COUNT } from "@/features/attempts/constants";
import { IconCafe } from "@/components/icons/pencil-icons";
import type { BrewDraftRecipe } from "@/features/brew/draft";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export function RecipeFields({
  value,
  onChange,
}: {
  value: BrewDraftRecipe;
  onChange: (next: BrewDraftRecipe) => void;
}) {
  const dict = useDictionary();
  const method = value.method ?? "espresso";
  const config = getRecipeFieldConfig(method);

  function set<K extends keyof BrewDraftRecipe>(key: K, v: BrewDraftRecipe[K]) {
    onChange({ ...value, [key]: v });
  }

  // Nothing has been brewed yet, so the ratio is measured against the
  // target weight rather than whatever ends up in the cup.
  const { ratio: finalRatio, brewRatio } = computeRatios(config, {
    doseG: value.doseG,
    waterG: value.waterG,
    dilutionWaterG: value.dilutionWaterG,
    brewWeightG: value.targetWeightG,
  });

  const fields: SteppableField[] = [
    { key: "doseG", label: dict.brew.doseG, value: value.doseG, onChange: (v) => set("doseG", v), step: 0.5, min: 0, suffix: "g" },
  ];
  if (config.hasWater) {
    fields.push({
      key: "waterG",
      label: dict.brew.waterG,
      value: value.waterG,
      onChange: (v) => set("waterG", v),
      step: 5,
      min: 0,
      suffix: "g",
    });
  }
  if (config.hasDilutionWater) {
    fields.push({
      key: "dilutionWaterG",
      label: dict.brew.dilutionWaterG,
      value: value.dilutionWaterG,
      onChange: (v) => set("dilutionWaterG", v),
      step: 5,
      min: 0,
      suffix: "g",
    });
  }
  fields.push(
    {
      key: "temperatureC",
      label: dict.brew.temperatureC,
      value: value.temperatureC,
      onChange: (v) => set("temperatureC", v),
      step: 1,
      min: 0,
      max: 100,
      suffix: "°C",
    },
    {
      key: "targetTimeMs",
      label: dict.brew[config.timeLabelKey],
      value: value.targetTimeMs !== undefined ? value.targetTimeMs / 1000 : undefined,
      onChange: (v) => set("targetTimeMs", Math.round(v * 1000)),
      step: method === "espresso" ? 1 : 5,
      min: 0,
      suffix: "s",
    },
  );

  const grinderConfigFields: SteppableField[] = [
    {
      key: "grinderUpperBurr",
      label: dict.brew.grinderUpperBurr,
      value: value.grinderUpperBurr,
      onChange: (v) => set("grinderUpperBurr", v),
      min: 1,
      max: 24,
      sublabel: value.grinderModelName,
    },
    {
      key: "grinderLowerBurr",
      label: dict.brew.grinderLowerBurr,
      value: value.grinderLowerBurr,
      onChange: (v) => set("grinderLowerBurr", v),
      min: 1,
      max: 24,
    },
  ];
  const hasGrinderConfig = value.grinderUpperBurr != null || value.grinderLowerBurr != null;
  if (config.hasMoka) {
    fields.push({
      key: "mokaCupSize",
      label: dict.brew.mokaCupSize,
      value: value.mokaCupSize,
      onChange: (v) => set("mokaCupSize", v),
      min: 1,
      max: 12,
    });
  }
  if (config.brewWeightMode !== "hidden") {
    fields.push({
      key: "targetWeightG",
      label: dict.brew.targetWeightG,
      value: value.targetWeightG,
      onChange: (v) => set("targetWeightG", v),
      step: 1,
      min: 0,
      suffix: "g",
      sublabel: config.brewWeightMode === "optional" ? dict.brew.optional : undefined,
    });
  }
  // Espresso answers this with the two cups below the grid; the moka pot
  // answers it with its own size. Everyone else types it here, among the
  // other numbers, because "four cups" is as much a part of a French press
  // recipe as the water is.
  if (config.cupCountMode === "manual") {
    fields.push({
      key: "cupCount",
      label: dict.brew.cupCount,
      value: value.cupCount,
      onChange: (v) => set("cupCount", v),
      step: 1,
      min: 1,
      max: MAX_CUP_COUNT,
    });
  }

  return (
    <div className="space-y-6">
      <SteppableFieldGrid fields={fields} />

      {/* One cup or two, and nothing else: a rule, then one cup against
          two. No heading and no captions — two cups drawn next to one cup
          is the whole question, and the set's own cup is what draws it.
          Both face the same way, so the pair reads as two of the same
          thing rather than as a mirrored ornament.

          It moves none of the numbers above it — a double is a different
          basket, not a single with the dose doubled, and the dose you want
          is the one you already set. With the labels gone, aria-label is
          now the only name these buttons have. */}
      {config.cupCountMode === "choice" && (
        <div className="border-t border-border pt-6">
          <div className="flex gap-2">
            {CUP_COUNTS.map((count) => {
              const selected = value.cupCount === count;
              return (
                <button
                  key={count}
                  type="button"
                  aria-pressed={selected}
                  aria-label={count === 1 ? dict.brew.oneCup : dict.brew.twoCups}
                  onClick={() => set("cupCount", count)}
                  className={cn(
                    "flex min-h-14 flex-1 items-center justify-center gap-1 rounded-input border transition-colors",
                    selected
                      ? "border-ink bg-ink text-surface"
                      : "border-border bg-surface text-ink-muted",
                  )}
                >
                  <IconCafe aria-hidden className="size-7" />
                  {count === 2 && <IconCafe aria-hidden className="size-7" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <SettingsAccordionCard title={dict.brew.grinderConfigTitle} defaultExpanded={hasGrinderConfig}>
        <p className="mb-4 text-xs text-ink-muted">{dict.brew.grinderConfigHint}</p>
        <SteppableFieldGrid fields={grinderConfigFields} />
      </SettingsAccordionCard>

      {config.hasMoka && (
        <div>
          <p className="mb-1.5 text-center text-xs font-medium uppercase tracking-wide text-ink-muted">
            {dict.brew.heatIntensity}
          </p>
          <div className="flex gap-2">
            {HEAT_INTENSITIES.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => set("heatIntensity", level)}
                className={cn(
                  "min-h-11 flex-1 rounded-input border text-sm font-medium transition-colors",
                  value.heatIntensity === level
                    ? "border-ink bg-ink text-surface"
                    : "border-border bg-surface text-ink-muted",
                )}
              >
                {dict.enums.heatIntensity[level]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-card border border-coffee/40 bg-surface p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{dict.brew.ratio}</p>
          <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-coffee">
            {dict.brew.auto}
          </span>
        </div>
        <p className="mt-1 font-display text-4xl text-coffee">
          {finalRatio !== undefined ? formatRatio(finalRatio) : "—"}
        </p>
        {brewRatio !== undefined && (
          <p className="mt-1 text-xs text-ink-muted">
            {dict.brew.brewRatioCaption} {formatRatio(brewRatio)}
          </p>
        )}
      </div>
    </div>
  );
}
