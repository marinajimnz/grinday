"use client";

import { Field, inputClassName } from "@/components/ui/Field";
import { TasteScale } from "@/components/ui/TasteScale";
import {
  DOSE_FEEDBACKS,
  DOSE_FEEDBACK_LABELS,
  PRESSURE_OBSERVATIONS,
  PRESSURE_OBSERVATION_LABELS,
  TASTE_DIMENSIONS,
  TASTE_DIMENSION_LABELS,
} from "@/features/attempts/constants";
import type { BrewDraftPostShot } from "@/features/brew/draft";

export function PostShotFields({
  value,
  onChange,
}: {
  value: BrewDraftPostShot;
  onChange: (next: BrewDraftPostShot) => void;
}) {
  function set<K extends keyof BrewDraftPostShot>(key: K, v: BrewDraftPostShot[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Feedback de dosis" htmlFor="postshot.doseFeedback">
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
            <option value="">Sin especificar</option>
            {DOSE_FEEDBACKS.map((f) => (
              <option key={f} value={f}>
                {DOSE_FEEDBACK_LABELS[f]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Presión observada" htmlFor="postshot.pressureObservation">
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
            <option value="">Sin especificar</option>
            {PRESSURE_OBSERVATIONS.map((p) => (
              <option key={p} value={p}>
                {PRESSURE_OBSERVATION_LABELS[p]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Entrada (g)" htmlFor="postshot.inputWeightG" hint="Opcional">
          <input
            id="postshot.inputWeightG"
            type="number"
            className={inputClassName}
            value={value.inputWeightG ?? ""}
            onChange={(e) => set("inputWeightG", e.target.valueAsNumber || undefined)}
          />
        </Field>
        <Field label="Salida (g)" htmlFor="postshot.outputWeightG" hint="Opcional">
          <input
            id="postshot.outputWeightG"
            type="number"
            className={inputClassName}
            value={value.outputWeightG ?? ""}
            onChange={(e) => set("outputWeightG", e.target.valueAsNumber || undefined)}
          />
        </Field>
        <Field label="Volumen (ml)" htmlFor="postshot.outputVolumeMl" hint="Opcional">
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
            label={TASTE_DIMENSION_LABELS[dim]}
            value={value[dim]}
            onChange={(v) => set(dim, v)}
          />
        ))}
      </div>

      <TasteScale
        id="postshot.overallRating"
        label="Puntuación general"
        value={value.overallRating}
        onChange={(v) => set("overallRating", v)}
      />

      <Field label="Notas" htmlFor="postshot.notes">
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
