"use client";

import {
  IconBalanza,
  IconCafe,
  IconGrano,
  IconHervidor,
  IconMoka,
  IconMolinillo,
  IconMuelaInferior,
  IconMuelaSuperior,
  IconPreparar,
  IconTemperatura,
} from "@/components/icons/pencil-icons";
import { cn } from "@/lib/cn";
import { METHOD_ICONS } from "@/features/equipment/methodIcons";
import { computeRatios, formatRatio, getRecipeFieldConfig } from "@/features/brew/recipeFieldConfig";
import { formatDuration } from "@/features/brew/formatTime";
import type { BrewMethod } from "@/features/equipment/constants";
import type { BrewAttemptRow } from "@/features/attempts/queries";
import { useDictionary } from "@/components/i18n/LocaleProvider";

type Metric = {
  label: string;
  value: string;
  caption?: string;
  // Optional: the set has 28 icons and no thermometer, no flame. A
  // metric with nothing that fits keeps its label bare rather than
  // borrowing an icon that means something else.
  icon?: typeof IconCafe;
};

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

  const cupCount = config.cupCountMode === "pot" ? null : attempt.cup_count;
  // Annotated rather than inferred: with `icon` optional, the union TS
  // builds from these branches has a variant per shape, and the one for
  // the single iconless metric pins `icon` to undefined, which the
  // Metric type guard below then can't satisfy.
  const candidates: Array<Metric | false | "" | null | undefined> = [
    doseG != null && { label: dict.brew.doseG, value: `${doseG} g`, icon: IconGrano },
    config.hasWater &&
      attempt.water_g != null && {
        label: dict.brew.waterG,
        value: `${attempt.water_g} g`,
        icon: IconHervidor,
      },
    config.hasDilutionWater &&
      attempt.dilution_water_g != null && {
        label: dict.brew.dilutionWaterG,
        value: `${attempt.dilution_water_g} g`,
        icon: IconHervidor,
      },
    config.brewWeightMode !== "hidden" &&
      brewWeightG != null && {
        label: dict.brew.targetWeightG,
        value: `${brewWeightG} g`,
        icon: IconBalanza,
        // Only worth saying when the cup missed the mark you aimed for.
        caption:
          attempt.target_weight_g != null && attempt.target_weight_g !== brewWeightG
            ? `${dict.brew.target} ${attempt.target_weight_g} g`
            : undefined,
      },
    attempt.grind_setting != null && {
      label: dict.brew.grindSetting,
      value: String(attempt.grind_setting),
      icon: IconMolinillo,
    },
    attempt.grind_seconds != null && {
      label: dict.brew.grindSeconds,
      value: String(attempt.grind_seconds),
      icon: IconPreparar,
    },
    // The guided flow collects these as part of the recipe (see
    // RecipeFields) and never writes grind_setting at all, so on a
    // two-stage grinder they're the only record of how it was ground.
    attempt.grinder_upper_burr != null && {
      label: dict.brew.grinderUpperBurr,
      value: String(attempt.grinder_upper_burr),
      icon: IconMuelaSuperior,
    },
    attempt.grinder_lower_burr != null && {
      label: dict.brew.grinderLowerBurr,
      value: String(attempt.grinder_lower_burr),
      icon: IconMuelaInferior,
    },
    attempt.temperature_c != null && {
      label: dict.brew.temperatureC,
      value: `${attempt.temperature_c} °C`,
      icon: IconTemperatura,
    },
    // No "objetivo 27 s" under this one: what the brew actually took is
    // the recipe, and the target it was aiming for is a detail of the run
    // that has already happened.
    attempt.extraction_ms != null && {
      label: dict.brew[config.timeLabelKey],
      value: formatDuration(attempt.extraction_ms),
      icon: IconPreparar,
    },
    config.hasMoka &&
      attempt.moka_cup_size != null && {
        label: dict.brew.mokaCupSize,
        value: String(attempt.moka_cup_size),
        icon: IconMoka,
      },
    config.hasMoka &&
      attempt.heat_intensity && {
        label: dict.brew.heatIntensity,
        value:
          dict.enums.heatIntensity[attempt.heat_intensity as keyof typeof dict.enums.heatIntensity],
      },
  ];
  const metrics = candidates.filter((m): m is Metric => Boolean(m));

  if (!metrics.length && ratio === undefined && cupCount == null) return null;

  return (
    <div className="rounded-card border border-coffee/40 bg-surface p-5">
      <div className="flex items-center gap-1.5 text-coffee">
        <Icon aria-hidden className="size-4 text-coffee" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {dict.equipment.methodLabels[method] ?? attempt.method}
        </span>
        {/* How many cups rides up here rather than sitting in the grid
            below: it says what kind of shot this was, which belongs with
            the method, and it's one digit where every cell around it is a
            measurement. The tinted pill is what makes it read as a badge on
            the line instead of a stray number at the end of a heading. */}
        {cupCount != null && (
          <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-coffee/10 px-2 py-0.5">
            <span className="sr-only">{dict.brew.cupCount}</span>
            <IconCafe aria-hidden className="size-4" />
            <span className="text-sm font-semibold tabular-nums">{cupCount}</span>
          </span>
        )}
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
          <div key={m.label} className="flex flex-col">
            {/* The number leads and its name sits underneath with its
                icon. The DOM keeps dt before dd, which is what a <dl>
                requires and what a screen reader wants to hear ("Temperatura,
                94 °C"); `order` is what puts the value on top for the eye.
                This also drops the old min-h-8 on the label: with the
                numbers first, every cell's number starts on the same line
                whether or not the name below it wraps. */}
            <dt className="order-2 mt-0.5 flex items-start gap-1.5 text-xs text-ink-muted">
              {m.icon && <m.icon aria-hidden className="mt-px size-4 shrink-0" />}
              <span>{m.label}</span>
            </dt>
            <dd className="order-1 text-lg font-semibold tabular-nums text-ink">{m.value}</dd>
            {/* Indented to the icon's width so it lines up under the
                label rather than hanging off the left edge of the cell —
                size-4 plus the gap-1.5 above it. */}
            {m.caption && (
              <p className={cn("order-3 text-xs text-ink-muted", m.icon && "ps-[22px]")}>
                {m.caption}
              </p>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
