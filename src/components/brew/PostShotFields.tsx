"use client";

import { Field, inputClassName } from "@/components/ui/Field";
import { TasteScale } from "@/components/ui/TasteScale";
import {
  DOSE_FEEDBACKS,
  PRESSURE_OBSERVATIONS,
  TASTE_DIMENSIONS,
} from "@/features/attempts/constants";
import type { BrewDraftPostShot } from "@/features/brew/draft";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export function PostShotFields({
  value,
  onChange,
}: {
  value: BrewDraftPostShot;
  onChange: (next: BrewDraftPostShot) => void;
}) {
  const dict = useDictionary();

  function set<K extends keyof BrewDraftPostShot>(key: K, v: BrewDraftPostShot[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={dict.brew.doseFeedback} htmlFor="postshot.doseFeedback">
          <select
            id="postshot.doseFeedback"
            className={inputClassName}
            value={value.doseFeedback ?? ""}
            onChange={(e) =>
              set(
                "doseFeedback",
                (e.target.value || undefined) as BrewDraftPostShot["doseFeedback"],
              )
            }
          >
            <option value="">{dict.coffees.notSpecified}</option>
            {DOSE_FEEDBACKS.map((f) => (
              <option key={f} value={f}>
                {dict.enums.doseFeedback[f]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={dict.brew.pressureObservation} htmlFor="postshot.pressureObservation">
          <select
            id="postshot.pressureObservation"
            className={inputClassName}
            value={value.pressureObservation ?? ""}
            onChange={(e) =>
              set(
                "pressureObservation",
                (e.target.value || undefined) as BrewDraftPostShot["pressureObservation"],
              )
            }
          >
            <option value="">{dict.coffees.notSpecified}</option>
            {PRESSURE_OBSERVATIONS.map((p) => (
              <option key={p} value={p}>
                {dict.enums.pressureObservation[p]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={dict.brew.inputWeight} htmlFor="postshot.inputWeightG" hint={dict.brew.optional}>
          <input
            id="postshot.inputWeightG"
            type="number"
            className={inputClassName}
            value={value.inputWeightG ?? ""}
            onChange={(e) => set("inputWeightG", e.target.valueAsNumber || undefined)}
          />
        </Field>
        <Field label={dict.brew.outputWeight} htmlFor="postshot.outputWeightG" hint={dict.brew.optional}>
          <input
            id="postshot.outputWeightG"
            type="number"
            className={inputClassName}
            value={value.outputWeightG ?? ""}
            onChange={(e) => set("outputWeightG", e.target.valueAsNumber || undefined)}
          />
        </Field>
        <Field label={dict.brew.outputVolume} htmlFor="postshot.outputVolumeMl" hint={dict.brew.optional}>
          <input
            id="postshot.outputVolumeMl"
            type="number"
            className={inputClassName}
            value={value.outputVolumeMl ?? ""}
            onChange={(e) => set("outputVolumeMl", e.target.valueAsNumber || undefined)}
          />
        </Field>
      </div>

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
    </div>
  );
}
