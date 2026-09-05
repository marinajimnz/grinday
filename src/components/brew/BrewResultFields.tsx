"use client";

import { cn } from "@/lib/cn";
import { Field, inputClassName } from "@/components/ui/Field";
import { TasteScale } from "@/components/ui/TasteScale";
import { SettingsAccordionCard } from "@/components/settings/SettingsAccordionCard";
import { TASTE_DIMENSIONS } from "@/features/attempts/constants";
import { RECIPE_FIELD_CONFIG } from "@/features/brew/recipeFieldConfig";
import type { BrewDraftRecipe, BrewDraftPostShot } from "@/features/brew/draft";
import { useDictionary } from "@/components/i18n/LocaleProvider";

function StatTile({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="text-2xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
      {sublabel && <p className="text-[11px] text-ink-muted">{sublabel}</p>}
    </div>
  );
}

export function BrewResultFields({
  recipe,
  extractionMs,
  value,
  onChange,
}: {
  recipe: BrewDraftRecipe;
  extractionMs: number | null;
  value: BrewDraftPostShot;
  onChange: (next: BrewDraftPostShot) => void;
}) {
  const dict = useDictionary();
  const method = recipe.method ?? "espresso";
  const config = RECIPE_FIELD_CONFIG[method];

  function set<K extends keyof BrewDraftPostShot>(key: K, v: BrewDraftPostShot[K]) {
    onChange({ ...value, [key]: v });
  }

  const showsWaterTile = config.brewWeightMode === "hidden";
  const weightValue = showsWaterTile ? recipe.waterG : value.outputWeightG;
  const weightTarget = showsWaterTile ? undefined : recipe.targetWeightG;
  const ratioDenominator = showsWaterTile ? recipe.waterG : (value.outputWeightG ?? recipe.targetWeightG);
  const ratio = recipe.doseG && ratioDenominator ? ratioDenominator / recipe.doseG : undefined;
  const actualSeconds = extractionMs !== null ? extractionMs / 1000 : undefined;
  const targetSeconds = recipe.targetTimeMs !== undefined ? recipe.targetTimeMs / 1000 : undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label={dict.brew.doseG} value={recipe.doseG !== undefined ? `${recipe.doseG} g` : "—"} />
        <StatTile
          label={showsWaterTile ? dict.brew.waterG : dict.brew.targetWeightG}
          value={weightValue !== undefined ? `${weightValue} g` : "—"}
          sublabel={weightTarget !== undefined ? `${dict.brew.target} ${weightTarget} g` : undefined}
        />
        <StatTile label={dict.brew.ratio} value={ratio !== undefined ? `1:${ratio.toFixed(1)}` : "—"} />
        <StatTile
          label={dict.brew[config.timeLabelKey]}
          value={actualSeconds !== undefined ? `${actualSeconds.toFixed(1)} s` : "—"}
          sublabel={targetSeconds !== undefined ? `${dict.brew.target} ${targetSeconds.toFixed(0)} s` : undefined}
        />
        <StatTile
          label={dict.brew.temperatureC}
          value={recipe.temperatureC !== undefined ? `${recipe.temperatureC} °C` : "—"}
        />
        <StatTile
          label={dict.brew.grindSetting}
          value={recipe.grindSetting !== undefined ? String(recipe.grindSetting) : "—"}
          sublabel={recipe.grinderModelName}
        />
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
