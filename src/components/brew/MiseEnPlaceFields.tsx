"use client";

import { Field, inputClassName } from "@/components/ui/Field";
import { MetricStepper } from "@/components/ui/MetricStepper";
import {
  BASKET_SIZE_LABELS,
  BASKET_SIZES,
  BASKET_WALL_LABELS,
  BASKET_WALLS,
  DOSE_MODE_LABELS,
  DOSE_MODES,
  SHOT_MODE_LABELS,
  SHOT_MODES,
} from "@/features/attempts/constants";
import type { BrewDraftRecipe } from "@/features/brew/draft";

export function MiseEnPlaceFields({
  value,
  onChange,
}: {
  value: BrewDraftRecipe;
  onChange: (next: BrewDraftRecipe) => void;
}) {
  function set<K extends keyof BrewDraftRecipe>(key: K, v: BrewDraftRecipe[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <MetricStepper
          label="Molido"
          value={value.grindSetting}
          onChange={(v) => set("grindSetting", v)}
          min={1}
        />
        <MetricStepper
          label="Molienda (s)"
          value={value.grindSeconds}
          onChange={(v) => set("grindSeconds", v)}
          step={0.5}
          min={0}
          suffix="s"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricStepper
          label="Temperatura"
          value={value.temperatureOffsetC}
          onChange={(v) => set("temperatureOffsetC", v)}
          min={-2}
          max={2}
          suffix="°C"
        />
        <MetricStepper
          label="Muela superior"
          value={value.upperBurrSetting}
          onChange={(v) => set("upperBurrSetting", v)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Dosificación" htmlFor="mep.doseMode">
          <select
            id="mep.doseMode"
            className={inputClassName}
            value={value.doseMode ?? ""}
            onChange={(e) => set("doseMode", (e.target.value || undefined) as BrewDraftRecipe["doseMode"])}
          >
            <option value="">Elige…</option>
            {DOSE_MODES.map((m) => (
              <option key={m} value={m}>
                {DOSE_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Modo de shot" htmlFor="mep.shotMode">
          <select
            id="mep.shotMode"
            className={inputClassName}
            value={value.shotMode ?? ""}
            onChange={(e) => set("shotMode", (e.target.value || undefined) as BrewDraftRecipe["shotMode"])}
          >
            <option value="">Elige…</option>
            {SHOT_MODES.map((m) => (
              <option key={m} value={m}>
                {SHOT_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Cesta" htmlFor="mep.basketSize">
          <select
            id="mep.basketSize"
            className={inputClassName}
            value={value.basketSize ?? ""}
            onChange={(e) => set("basketSize", (e.target.value || undefined) as BrewDraftRecipe["basketSize"])}
          >
            <option value="">Elige…</option>
            {BASKET_SIZES.map((s) => (
              <option key={s} value={s}>
                {BASKET_SIZE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Pared" htmlFor="mep.basketWall">
          <select
            id="mep.basketWall"
            className={inputClassName}
            value={value.basketWall ?? ""}
            onChange={(e) => set("basketWall", (e.target.value || undefined) as BrewDraftRecipe["basketWall"])}
          >
            <option value="">Sin especificar</option>
            {BASKET_WALLS.map((w) => (
              <option key={w} value={w}>
                {BASKET_WALL_LABELS[w]}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}
