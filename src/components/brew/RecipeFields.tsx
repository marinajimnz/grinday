"use client";

import { MetricStepper } from "@/components/ui/MetricStepper";
import { cn } from "@/lib/cn";
import { RECIPE_FIELD_CONFIG } from "@/features/brew/recipeFieldConfig";
import { HEAT_INTENSITIES } from "@/features/attempts/constants";
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
  const config = RECIPE_FIELD_CONFIG[method];

  function set<K extends keyof BrewDraftRecipe>(key: K, v: BrewDraftRecipe[K]) {
    onChange({ ...value, [key]: v });
  }

  const denominator = config.ratioDenominator === "targetWeightG" ? value.targetWeightG : value.waterG;
  const ratio = value.doseG && denominator ? denominator / value.doseG : undefined;

  return (
    <div className="mx-auto max-w-xs space-y-6">
      <MetricStepper
        label={dict.brew.doseG}
        value={value.doseG}
        onChange={(v) => set("doseG", v)}
        step={0.5}
        min={0}
        suffix="g"
      />
      {config.hasWater && (
        <MetricStepper
          label={dict.brew.waterG}
          value={value.waterG}
          onChange={(v) => set("waterG", v)}
          step={5}
          min={0}
          suffix="g"
        />
      )}

      <MetricStepper
        label={dict.brew.temperatureC}
        value={value.temperatureC}
        onChange={(v) => set("temperatureC", v)}
        step={1}
        min={0}
        max={100}
        suffix="°C"
      />
      <MetricStepper
        label={dict.brew[config.timeLabelKey]}
        value={value.targetTimeMs !== undefined ? value.targetTimeMs / 1000 : undefined}
        onChange={(v) => set("targetTimeMs", Math.round(v * 1000))}
        step={method === "espresso" ? 1 : 5}
        min={0}
        suffix="s"
      />

      <div>
        <MetricStepper
          label={dict.brew.grindSetting}
          value={value.grindSetting}
          onChange={(v) => set("grindSetting", v)}
          step={0.5}
          min={0}
        />
        {value.grinderModelName && (
          <p className="mt-1 text-center text-xs text-ink-muted">{value.grinderModelName}</p>
        )}
      </div>

      {config.hasMoka && (
        <>
          <MetricStepper
            label={dict.brew.mokaCupSize}
            value={value.mokaCupSize}
            onChange={(v) => set("mokaCupSize", v)}
            min={1}
            max={12}
          />
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
        </>
      )}

      {config.brewWeightMode !== "hidden" && (
        <div>
          <MetricStepper
            label={dict.brew.targetWeightG}
            value={value.targetWeightG}
            onChange={(v) => set("targetWeightG", v)}
            step={5}
            min={0}
            suffix="g"
          />
          {config.brewWeightMode === "optional" && (
            <p className="mt-1 text-center text-[11px] text-ink-muted">{dict.brew.optional}</p>
          )}
        </div>
      )}

      <div className="rounded-card border border-coffee/40 bg-surface p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{dict.brew.ratio}</p>
          <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-coffee">
            {dict.brew.auto}
          </span>
        </div>
        <p className="mt-1 font-display text-4xl text-coffee">{ratio !== undefined ? `1:${ratio.toFixed(1)}` : "—"}</p>
      </div>
    </div>
  );
}
