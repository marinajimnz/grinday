"use client";

import { IconCafe } from "@/components/icons/pencil-icons";
import { METHOD_ICONS } from "@/features/equipment/methodIcons";
import { computeRatios, formatRatio, getRecipeFieldConfig } from "@/features/brew/recipeFieldConfig";
import { formatDuration } from "@/features/brew/formatTime";
import type { BrewMethod } from "@/features/equipment/constants";
import type { BrewAttemptRow } from "@/features/attempts/queries";
import { useDictionary } from "@/components/i18n/LocaleProvider";

type Metric = { label: string; value: string; caption?: string };

// Everything this attempt needs to be brewed again, in the order a recipe
// reads. The detail page used to open on the manual form's field list
// instead — seventeen equally-weighted cells, none of which was the recipe,
// because the guided flow writes dose_g/water_g/target_weight_g and that
// list only ever showed the Sage-era columns next to them.
export function AttemptRecipeSummary({ attempt }: { attempt: BrewAttemptRow }) {
  const dict = useDictionary();
  const method = (attempt.method as BrewMethod) ?? "espresso";
  const config = getRecipeFieldConfig(method);
  const Icon = METHOD_ICONS[method] ?? IconCafe;

  // Two names for the same two numbers: the guided flow records a dose and a
  // beverage weight, the manual form recorded an input and an output weight.
  // Read whichever pair this attempt happens to carry.
  const doseG = attempt.dose_g ?? attempt.input_weight_g;
  const brewWeightG = attempt.output_weight_g ?? attempt.target_weight_g;

  const { ratio, brewRatio } = computeRatios(config, {
    doseG,
    waterG: attempt.water_g,
    dilutionWaterG: attempt.dilution_water_g,
    brewWeightG,
  });

  const targetTimeMs = attempt.target_time_ms;
  const metrics = [
    doseG != null && { label: dict.brew.doseG, value: `${doseG} g` },
    config.hasWater &&
      attempt.water_g != null && { label: dict.brew.waterG, value: `${attempt.water_g} g` },
    config.hasDilutionWater &&
      attempt.dilution_water_g != null && {
        label: dict.brew.dilutionWaterG,
        value: `${attempt.dilution_water_g} g`,
      },
    config.brewWeightMode !== "hidden" &&
      brewWeightG != null && {
        label: dict.brew.targetWeightG,
        value: `${brewWeightG} g`,
        // Only worth saying when the cup missed the mark you aimed for.
        caption:
          attempt.target_weight_g != null && attempt.target_weight_g !== brewWeightG
            ? `${dict.brew.target} ${attempt.target_weight_g} g`
            : undefined,
      },
    attempt.grind_setting != null && {
      label: dict.brew.grindSetting,
      value: String(attempt.grind_setting),
    },
    attempt.grind_seconds != null && {
      label: dict.brew.grindSeconds,
      value: String(attempt.grind_seconds),
    },
    // The guided flow collects these as part of the recipe (see
    // RecipeFields) and never writes grind_setting at all, so on a
    // two-stage grinder they're the only record of how it was ground.
    attempt.grinder_upper_burr != null && {
      label: dict.brew.grinderUpperBurr,
      value: String(attempt.grinder_upper_burr),
    },
    attempt.grinder_lower_burr != null && {
      label: dict.brew.grinderLowerBurr,
      value: String(attempt.grinder_lower_burr),
    },
    attempt.temperature_c != null && {
      label: dict.brew.temperatureC,
      value: `${attempt.temperature_c} °C`,
    },
    attempt.extraction_ms != null && {
      label: dict.brew[config.timeLabelKey],
      value: formatDuration(attempt.extraction_ms),
      caption: targetTimeMs != null ? `${dict.brew.target} ${formatDuration(targetTimeMs)}` : undefined,
    },
    config.hasMoka &&
      attempt.moka_cup_size != null && {
        label: dict.brew.mokaCupSize,
        value: String(attempt.moka_cup_size),
      },
    config.hasMoka &&
      attempt.heat_intensity && {
        label: dict.brew.heatIntensity,
        value:
          dict.enums.heatIntensity[attempt.heat_intensity as keyof typeof dict.enums.heatIntensity],
      },
  ].filter((m): m is Metric => Boolean(m));

  if (!metrics.length && ratio === undefined) return null;

  return (
    <div className="rounded-card border border-coffee/40 bg-surface p-5">
      <div className="flex items-center gap-1.5 text-coffee">
        <Icon aria-hidden className="size-4 text-coffee" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {dict.equipment.methodLabels[method] ?? attempt.method}
        </span>
      </div>

      {ratio !== undefined && (
        <div className="mt-2">
          <p className="font-display text-4xl text-coffee">{formatRatio(ratio)}</p>
          <p className="text-xs text-ink-muted">
            {dict.brew.ratio}
            {brewRatio !== undefined && ` · ${dict.brew.brewRatioCaption} ${formatRatio(brewRatio)}`}
          </p>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label}>
            {/* Two lines' worth, so a label that wraps — "Tiempo de
                extracción" does, on every espresso — doesn't push its
                number below the one sitting next to it. */}
            <dt className="min-h-8 text-xs text-ink-muted">{m.label}</dt>
            <dd className="text-lg font-semibold tabular-nums text-ink">{m.value}</dd>
            {m.caption && <p className="text-xs text-ink-muted">{m.caption}</p>}
          </div>
        ))}
      </dl>
    </div>
  );
}
