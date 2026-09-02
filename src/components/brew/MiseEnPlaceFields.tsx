"use client";

import { Field, inputClassName } from "@/components/ui/Field";
import { MetricStepper } from "@/components/ui/MetricStepper";
import {
  BASKET_SIZES,
  BASKET_WALLS,
  DOSE_MODES,
  SHOT_MODES,
} from "@/features/attempts/constants";
import type { BrewDraftRecipe } from "@/features/brew/draft";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export function MiseEnPlaceFields({
  value,
  onChange,
}: {
  value: BrewDraftRecipe;
  onChange: (next: BrewDraftRecipe) => void;
}) {
  const dict = useDictionary();

  function set<K extends keyof BrewDraftRecipe>(key: K, v: BrewDraftRecipe[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <MetricStepper
          label={dict.brew.grindSetting}
          value={value.grindSetting}
          onChange={(v) => set("grindSetting", v)}
          min={1}
        />
        <MetricStepper
          label={dict.brew.grindSeconds}
          value={value.grindSeconds}
          onChange={(v) => set("grindSeconds", v)}
          step={0.5}
          min={0}
          suffix="s"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricStepper
          label={dict.brew.temperature}
          value={value.temperatureOffsetC}
          onChange={(v) => set("temperatureOffsetC", v)}
          min={-2}
          max={2}
          suffix="°C"
        />
        <MetricStepper
          label={dict.brew.upperBurr}
          value={value.upperBurrSetting}
          onChange={(v) => set("upperBurrSetting", v)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={dict.brew.doseMode} htmlFor="mep.doseMode">
          <select
            id="mep.doseMode"
            className={inputClassName}
            value={value.doseMode ?? ""}
            onChange={(e) => set("doseMode", (e.target.value || undefined) as BrewDraftRecipe["doseMode"])}
          >
            <option value="">{dict.brew.choose}</option>
            {DOSE_MODES.map((m) => (
              <option key={m} value={m}>
                {dict.enums.doseMode[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={dict.brew.shotMode} htmlFor="mep.shotMode">
          <select
            id="mep.shotMode"
            className={inputClassName}
            value={value.shotMode ?? ""}
            onChange={(e) => set("shotMode", (e.target.value || undefined) as BrewDraftRecipe["shotMode"])}
          >
            <option value="">{dict.brew.choose}</option>
            {SHOT_MODES.map((m) => (
              <option key={m} value={m}>
                {dict.enums.shotMode[m]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={dict.brew.basketSize} htmlFor="mep.basketSize">
          <select
            id="mep.basketSize"
            className={inputClassName}
            value={value.basketSize ?? ""}
            onChange={(e) => set("basketSize", (e.target.value || undefined) as BrewDraftRecipe["basketSize"])}
          >
            <option value="">{dict.brew.choose}</option>
            {BASKET_SIZES.map((s) => (
              <option key={s} value={s}>
                {dict.enums.basketSize[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={dict.brew.basketWall} htmlFor="mep.basketWall">
          <select
            id="mep.basketWall"
            className={inputClassName}
            value={value.basketWall ?? ""}
            onChange={(e) => set("basketWall", (e.target.value || undefined) as BrewDraftRecipe["basketWall"])}
          >
            <option value="">{dict.coffees.notSpecified}</option>
            {BASKET_WALLS.map((w) => (
              <option key={w} value={w}>
                {dict.enums.basketWall[w]}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}
