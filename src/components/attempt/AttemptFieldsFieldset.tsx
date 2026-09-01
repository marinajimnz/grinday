"use client";

import { Controller, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { Field, inputClassName } from "@/components/ui/Field";
import { TasteScale } from "@/components/ui/TasteScale";
import {
  BASKET_SIZES,
  BASKET_SIZE_LABELS,
  BASKET_WALLS,
  BASKET_WALL_LABELS,
  DOSE_FEEDBACKS,
  DOSE_FEEDBACK_LABELS,
  DOSE_MODES,
  DOSE_MODE_LABELS,
  PRESSURE_OBSERVATIONS,
  PRESSURE_OBSERVATION_LABELS,
  SHOT_MODES,
  SHOT_MODE_LABELS,
  TASTE_DIMENSIONS,
  TASTE_DIMENSION_LABELS,
} from "@/features/attempts/constants";
import type { z } from "zod";
import type { attemptFieldsSchema } from "@/lib/validation/attempts";

export type AttemptFormValues = { attempt: z.infer<typeof attemptFieldsSchema> };

// See CoffeeFieldsFieldset for why register/control are loosely typed.
export function AttemptFieldsFieldset({
  register,
  control,
  errors,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  errors?: FieldErrors<z.infer<typeof attemptFieldsSchema>>;
}) {
  return (
    <div className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-ink">Molienda</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Molido"
            htmlFor="attempt.grindSetting"
            error={errors?.grindSetting?.message}
          >
            <input
              id="attempt.grindSetting"
              type="number"
              step="1"
              className={inputClassName}
              {...register("attempt.grindSetting", { valueAsNumber: true })}
            />
          </Field>
          <Field
            label="Segundos de molienda"
            htmlFor="attempt.grindSeconds"
            error={errors?.grindSeconds?.message}
          >
            <input
              id="attempt.grindSeconds"
              type="number"
              step="0.1"
              className={inputClassName}
              {...register("attempt.grindSeconds", { valueAsNumber: true })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Dosificación" htmlFor="attempt.doseMode" error={errors?.doseMode?.message}>
            <select id="attempt.doseMode" className={inputClassName} {...register("attempt.doseMode")}>
              <option value="">Elige…</option>
              {DOSE_MODES.map((m) => (
                <option key={m} value={m}>
                  {DOSE_MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Feedback de dosis" htmlFor="attempt.doseFeedback">
            <select id="attempt.doseFeedback" className={inputClassName} {...register("attempt.doseFeedback")}>
              <option value="">Sin especificar</option>
              {DOSE_FEEDBACKS.map((f) => (
                <option key={f} value={f}>
                  {DOSE_FEEDBACK_LABELS[f]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
          <input type="checkbox" className="size-4" {...register("attempt.usedBitMore")} />
          Usé &quot;A Bit More&quot;
        </label>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-ink">Cesta</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tamaño" htmlFor="attempt.basketSize" error={errors?.basketSize?.message}>
            <select id="attempt.basketSize" className={inputClassName} {...register("attempt.basketSize")}>
              <option value="">Elige…</option>
              {BASKET_SIZES.map((s) => (
                <option key={s} value={s}>
                  {BASKET_SIZE_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pared" htmlFor="attempt.basketWall">
            <select id="attempt.basketWall" className={inputClassName} {...register("attempt.basketWall")}>
              <option value="">Sin especificar</option>
              {BASKET_WALLS.map((w) => (
                <option key={w} value={w}>
                  {BASKET_WALL_LABELS[w]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-ink">Temperatura y muela</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Offset de temperatura (°C)" htmlFor="attempt.temperatureOffsetC" hint="-2 a +2">
            <input
              id="attempt.temperatureOffsetC"
              type="number"
              className={inputClassName}
              {...register("attempt.temperatureOffsetC", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Muela superior" htmlFor="attempt.upperBurrSetting" hint="Opcional">
            <input
              id="attempt.upperBurrSetting"
              type="number"
              className={inputClassName}
              {...register("attempt.upperBurrSetting", { valueAsNumber: true })}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-ink">Extracción</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Modo de shot" htmlFor="attempt.shotMode" error={errors?.shotMode?.message}>
            <select id="attempt.shotMode" className={inputClassName} {...register("attempt.shotMode")}>
              <option value="">Elige…</option>
              {SHOT_MODES.map((m) => (
                <option key={m} value={m}>
                  {SHOT_MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tiempo de extracción (ms)" htmlFor="attempt.extractionMs" hint="Opcional en esta fase">
            <input
              id="attempt.extractionMs"
              type="number"
              className={inputClassName}
              {...register("attempt.extractionMs", { valueAsNumber: true })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Preinfusión (ms)" htmlFor="attempt.preinfusionMs" hint="Opcional">
            <input
              id="attempt.preinfusionMs"
              type="number"
              className={inputClassName}
              {...register("attempt.preinfusionMs", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Presión observada" htmlFor="attempt.pressureObservation">
            <select
              id="attempt.pressureObservation"
              className={inputClassName}
              {...register("attempt.pressureObservation")}
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
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-ink">Peso y volumen</legend>
        <p className="text-xs text-ink-muted">
          Opcional — preparado para una futura báscula, no lo necesitas si no tienes una.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Entrada (g)" htmlFor="attempt.inputWeightG">
            <input
              id="attempt.inputWeightG"
              type="number"
              className={inputClassName}
              {...register("attempt.inputWeightG", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Salida (g)" htmlFor="attempt.outputWeightG">
            <input
              id="attempt.outputWeightG"
              type="number"
              className={inputClassName}
              {...register("attempt.outputWeightG", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Volumen (ml)" htmlFor="attempt.outputVolumeMl">
            <input
              id="attempt.outputVolumeMl"
              type="number"
              className={inputClassName}
              {...register("attempt.outputVolumeMl", { valueAsNumber: true })}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-ink">Cata</legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {TASTE_DIMENSIONS.map((dim) => (
            <Controller
              key={dim}
              name={`attempt.${dim}`}
              control={control}
              render={({ field }) => (
                <TasteScale
                  id={`attempt.${dim}`}
                  label={TASTE_DIMENSION_LABELS[dim]}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          ))}
        </div>

        <Controller
          name="attempt.overallRating"
          control={control}
          render={({ field }) => (
            <TasteScale
              id="attempt.overallRating"
              label="Puntuación general"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <Field label="Notas" htmlFor="attempt.notes">
          <textarea
            id="attempt.notes"
            rows={4}
            className={`${inputClassName} py-2`}
            {...register("attempt.notes")}
          />
        </Field>
      </fieldset>
    </div>
  );
}
