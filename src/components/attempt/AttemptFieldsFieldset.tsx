"use client";

import { Controller, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { Field, inputClassName } from "@/components/ui/Field";
import { TasteScale } from "@/components/ui/TasteScale";
import {
  BASKET_SIZES,
  DOSE_FEEDBACKS,
  DOSE_MODES,
  SHOT_MODES,
  TASTE_DIMENSIONS,
} from "@/features/attempts/constants";
import type { z } from "zod";
import type { attemptFieldsSchema } from "@/lib/validation/attempts";
import { useDictionary } from "@/components/i18n/LocaleProvider";

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
  const dict = useDictionary();

  return (
    <div className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-ink">{dict.attempts.grinding}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={dict.brew.grindSetting}
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
            label={dict.attempts.grindSeconds}
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
          <Field label={dict.brew.doseMode} htmlFor="attempt.doseMode" error={errors?.doseMode?.message}>
            <select id="attempt.doseMode" className={inputClassName} {...register("attempt.doseMode")}>
              <option value="">{dict.brew.choose}</option>
              {DOSE_MODES.map((m) => (
                <option key={m} value={m}>
                  {dict.enums.doseMode[m]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={dict.brew.doseFeedback} htmlFor="attempt.doseFeedback">
            <select id="attempt.doseFeedback" className={inputClassName} {...register("attempt.doseFeedback")}>
              <option value="">{dict.coffees.notSpecified}</option>
              {DOSE_FEEDBACKS.map((f) => (
                <option key={f} value={f}>
                  {dict.enums.doseFeedback[f]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-ink">{dict.attempts.basket}</legend>
        <Field label={dict.attempts.basketSize} htmlFor="attempt.basketSize" error={errors?.basketSize?.message}>
          <select id="attempt.basketSize" className={inputClassName} {...register("attempt.basketSize")}>
            <option value="">{dict.brew.choose}</option>
            {BASKET_SIZES.map((s) => (
              <option key={s} value={s}>
                {dict.enums.basketSize[s]}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-ink">{dict.attempts.temperatureAndBurr}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={dict.attempts.temperatureOffset}
            htmlFor="attempt.temperatureOffsetC"
            hint={dict.attempts.temperatureRange}
          >
            <input
              id="attempt.temperatureOffsetC"
              type="number"
              className={inputClassName}
              {...register("attempt.temperatureOffsetC", { valueAsNumber: true })}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-ink">{dict.attempts.extraction}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={dict.brew.shotMode} htmlFor="attempt.shotMode" error={errors?.shotMode?.message}>
            <select id="attempt.shotMode" className={inputClassName} {...register("attempt.shotMode")}>
              <option value="">{dict.brew.choose}</option>
              {SHOT_MODES.map((m) => (
                <option key={m} value={m}>
                  {dict.enums.shotMode[m]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={dict.attempts.extractionTime}
            htmlFor="attempt.extractionMs"
            hint={dict.attempts.optionalPhase}
          >
            <input
              id="attempt.extractionMs"
              type="number"
              className={inputClassName}
              {...register("attempt.extractionMs", { valueAsNumber: true })}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-ink">{dict.attempts.weightAndVolume}</legend>
        <p className="text-xs text-ink-muted">{dict.attempts.weightVolumeNote}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={dict.brew.inputWeight} htmlFor="attempt.inputWeightG">
            <input
              id="attempt.inputWeightG"
              type="number"
              className={inputClassName}
              {...register("attempt.inputWeightG", { valueAsNumber: true })}
            />
          </Field>
          <Field label={dict.brew.outputWeight} htmlFor="attempt.outputWeightG">
            <input
              id="attempt.outputWeightG"
              type="number"
              className={inputClassName}
              {...register("attempt.outputWeightG", { valueAsNumber: true })}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-ink">{dict.attempts.tasting}</legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {TASTE_DIMENSIONS.map((dim) => (
            <Controller
              key={dim}
              name={`attempt.${dim}`}
              control={control}
              render={({ field }) => (
                <TasteScale
                  id={`attempt.${dim}`}
                  label={dict.enums.tasteDimension[dim]}
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
              label={dict.brew.overallRating}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <Field label={dict.brew.notes} htmlFor="attempt.notes">
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
