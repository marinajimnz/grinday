"use client";

import { cn } from "@/lib/cn";
import { Field, inputClassName } from "@/components/ui/Field";
import { TasteScale } from "@/components/ui/TasteScale";
import { SettingsAccordionCard } from "@/components/settings/SettingsAccordionCard";
import { SteppableFieldGrid, type SteppableField } from "./SteppableFieldGrid";
import { TASTE_DIMENSIONS } from "@/features/attempts/constants";
import { getRecipeFieldConfig, formatRatio } from "@/features/brew/recipeFieldConfig";
import type { BrewDraftRecipe, BrewDraftPostShot } from "@/features/brew/draft";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export function BrewResultFields({
  recipe,
  onRecipeChange,
  extractionMs,
  onExtractionChange,
  value,
  onChange,
}: {
  recipe: BrewDraftRecipe;
  onRecipeChange: (next: BrewDraftRecipe) => void;
  extractionMs: number | null;
  onExtractionChange: (ms: number | null) => void;
  value: BrewDraftPostShot;
  onChange: (next: BrewDraftPostShot) => void;
}) {
  const dict = useDictionary();
  const method = recipe.method ?? "espresso";
  const config = getRecipeFieldConfig(method);

  function set<K extends keyof BrewDraftPostShot>(key: K, v: BrewDraftPostShot[K]) {
    onChange({ ...value, [key]: v });
  }

  function setRecipe<K extends keyof BrewDraftRecipe>(key: K, v: BrewDraftRecipe[K]) {
    onRecipeChange({ ...recipe, [key]: v });
  }

  // The ratio always follows the method's own convention (coffee/brew for
  // espresso, coffee/water for everything else) regardless of whether the
  // brew-weight field is also shown — editing brew weight lets you correct
  // that number without changing what the ratio itself is measuring.
  const usesBrewWeightRatio = config.ratioDenominator === "targetWeightG";
  const hasDilution = config.hasDilutionWater && recipe.dilutionWaterG != null;
  const waterBasedDenominator = hasDilution
    ? (recipe.waterG ?? 0) + (recipe.dilutionWaterG ?? 0)
    : recipe.waterG;
  const ratioDenominator = usesBrewWeightRatio
    ? (value.outputWeightG ?? recipe.targetWeightG)
    : waterBasedDenominator;
  const ratio = recipe.doseG && ratioDenominator ? ratioDenominator / recipe.doseG : undefined;
  const brewRatio =
    hasDilution && recipe.doseG && recipe.waterG ? recipe.waterG / recipe.doseG : undefined;
  const actualSeconds = extractionMs !== null ? Math.round(extractionMs / 100) / 10 : undefined;
  const targetSeconds = recipe.targetTimeMs !== undefined ? recipe.targetTimeMs / 1000 : undefined;

  const fields: SteppableField[] = [
    {
      key: "doseG",
      label: dict.brew.doseG,
      value: recipe.doseG,
      onChange: (v) => setRecipe("doseG", v),
      step: 0.5,
      min: 0,
      suffix: "g",
    },
  ];
  if (config.hasWater) {
    fields.push({
      key: "waterG",
      label: dict.brew.waterG,
      value: recipe.waterG,
      onChange: (v) => setRecipe("waterG", v),
      step: 5,
      min: 0,
      suffix: "g",
    });
  }
  if (config.hasDilutionWater) {
    fields.push({
      key: "dilutionWaterG",
      label: dict.brew.dilutionWaterG,
      value: recipe.dilutionWaterG,
      onChange: (v) => setRecipe("dilutionWaterG", v),
      step: 5,
      min: 0,
      suffix: "g",
    });
  }
  if (config.brewWeightMode !== "hidden") {
    const effectiveOutputWeight = value.outputWeightG ?? recipe.targetWeightG;
    fields.push({
      key: "outputWeightG",
      label: dict.brew.targetWeightG,
      value: effectiveOutputWeight,
      onChange: (v) => set("outputWeightG", v),
      step: 1,
      min: 0,
      suffix: "g",
      sublabel:
        recipe.targetWeightG !== undefined && effectiveOutputWeight !== recipe.targetWeightG
          ? `${dict.brew.target} ${recipe.targetWeightG} g`
          : undefined,
    });
  }
  fields.push(
    {
      key: "extractionMs",
      label: dict.brew[config.timeLabelKey],
      value: actualSeconds,
      onChange: (v) => onExtractionChange(Math.round(v * 1000)),
      step: method === "espresso" ? 0.1 : 1,
      min: 0,
      suffix: "s",
      sublabel: targetSeconds !== undefined ? `${dict.brew.target} ${targetSeconds.toFixed(0)} s` : undefined,
    },
    {
      key: "temperatureC",
      label: dict.brew.temperatureC,
      value: recipe.temperatureC,
      onChange: (v) => setRecipe("temperatureC", v),
      step: 1,
      suffix: "°C",
    },
    {
      key: "grindSetting",
      label: dict.brew.grindSetting,
      value: recipe.grindSetting,
      onChange: (v) => setRecipe("grindSetting", v),
      step: 0.5,
      sublabel: recipe.grinderModelName,
    },
  );

  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-muted">{dict.brew.resultEditableNote}</p>

      <SteppableFieldGrid fields={fields} />

      <div className="rounded-card border border-coffee/40 bg-surface p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{dict.brew.ratio}</p>
          <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-coffee">
            {dict.brew.auto}
          </span>
        </div>
        <p className="mt-1 font-display text-4xl text-coffee">{ratio !== undefined ? formatRatio(ratio) : "—"}</p>
        {brewRatio !== undefined && (
          <p className="mt-1 text-xs text-ink-muted">
            {dict.brew.brewRatioCaption} {formatRatio(brewRatio)}
          </p>
        )}
      </div>

      <TasteScale
        id="postshot.overallRating"
        label={dict.brew.overallRating}
        value={value.overallRating}
        onChange={(v) => set("overallRating", v)}
      />

      <Field label={dict.brew.notes} htmlFor="postshot.notes">
        <textarea
          id="postshot.notes"
          rows={4}
          className={`${inputClassName} py-2`}
          value={value.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>

      <SettingsAccordionCard title={dict.brew.addSensoryRating}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {TASTE_DIMENSIONS.map((dim) => (
            <TasteScale
              key={dim}
              id={`postshot.${dim}`}
              label={dict.enums.tasteDimension[dim]}
              value={value[dim]}
              onChange={(v) => set(dim, v)}
            />
          ))}
        </div>
      </SettingsAccordionCard>

      <Field label={dict.brew.tds} htmlFor="postshot.tdsPercent" hint={dict.brew.optional}>
        <input
          id="postshot.tdsPercent"
          type="number"
          step="0.01"
          className={inputClassName}
          value={value.tdsPercent ?? ""}
          onChange={(e) => set("tdsPercent", e.target.valueAsNumber || undefined)}
        />
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">{dict.brew.wouldBrewAgain}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set("wouldBrewAgain", true)}
            className={cn(
              "min-h-11 flex-1 rounded-input border text-sm font-medium",
              value.wouldBrewAgain === true
                ? "border-ink bg-ink text-surface"
                : "border-border bg-surface text-ink-muted",
            )}
          >
            {dict.common.yes}
          </button>
          <button
            type="button"
            onClick={() => set("wouldBrewAgain", false)}
            className={cn(
              "min-h-11 flex-1 rounded-input border text-sm font-medium",
              value.wouldBrewAgain === false
                ? "border-ink bg-ink text-surface"
                : "border-border bg-surface text-ink-muted",
            )}
          >
            {dict.common.no}
          </button>
        </div>
      </div>
    </div>
  );
}
