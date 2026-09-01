"use client";

import { Controller, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { Field, inputClassName } from "@/components/ui/Field";
import { TagInput } from "@/components/ui/TagInput";
import { ROAST_LEVELS, ROAST_LEVEL_LABELS } from "@/features/coffees/constants";
import type { z } from "zod";
import type { coffeeFieldsSchema } from "@/lib/validation/coffees";

export type CoffeeFormValues = { coffee: z.infer<typeof coffeeFieldsSchema> };

// Loosely typed on purpose: this fieldset is reused by forms whose root shape
// differs (create vs edit), and RHF's generics don't unify cleanly across
// those without heavy casting. The parent's local zod schema is the real
// source of truth for what gets submitted.
export function CoffeeFieldsFieldset({
  register,
  control,
  errors,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  errors?: FieldErrors<z.infer<typeof coffeeFieldsSchema>>;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="font-display text-lg text-ink">El café</legend>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="coffee.name" error={errors?.name?.message}>
          <input id="coffee.name" className={inputClassName} {...register("coffee.name")} />
        </Field>
        <Field label="Tostador" htmlFor="coffee.roaster" error={errors?.roaster?.message}>
          <input id="coffee.roaster" className={inputClassName} {...register("coffee.roaster")} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="País" htmlFor="coffee.country">
          <input id="coffee.country" className={inputClassName} {...register("coffee.country")} />
        </Field>
        <Field label="Región" htmlFor="coffee.region">
          <input id="coffee.region" className={inputClassName} {...register("coffee.region")} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Finca" htmlFor="coffee.farm">
          <input id="coffee.farm" className={inputClassName} {...register("coffee.farm")} />
        </Field>
        <Field label="Productor" htmlFor="coffee.producer">
          <input id="coffee.producer" className={inputClassName} {...register("coffee.producer")} />
        </Field>
      </div>

      <Field label="Variedades" htmlFor="coffee.varieties-input">
        <Controller
          name="coffee.varieties"
          control={control}
          render={({ field }) => (
            <TagInput
              id="coffee.varieties-input"
              value={field.value ?? []}
              onChange={field.onChange}
              placeholder="Caturra, Bourbon…"
            />
          )}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Proceso" htmlFor="coffee.process">
          <input
            id="coffee.process"
            className={inputClassName}
            placeholder="Lavado, natural, honey…"
            {...register("coffee.process")}
          />
        </Field>
        <Field
          label="Nivel de tueste"
          htmlFor="coffee.roastLevel"
          error={errors?.roastLevel?.message}
        >
          <select
            id="coffee.roastLevel"
            className={inputClassName}
            defaultValue=""
            {...register("coffee.roastLevel")}
          >
            <option value="">Sin especificar</option>
            {ROAST_LEVELS.map((level) => (
              <option key={level} value={level}>
                {ROAST_LEVEL_LABELS[level]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Altitud mínima (m)"
          htmlFor="coffee.altitudeMinM"
          error={errors?.altitudeMinM?.message}
        >
          <input
            id="coffee.altitudeMinM"
            type="number"
            className={inputClassName}
            {...register("coffee.altitudeMinM", { valueAsNumber: true })}
          />
        </Field>
        <Field
          label="Altitud máxima (m)"
          htmlFor="coffee.altitudeMaxM"
          error={errors?.altitudeMaxM?.message}
        >
          <input
            id="coffee.altitudeMaxM"
            type="number"
            className={inputClassName}
            {...register("coffee.altitudeMaxM", { valueAsNumber: true })}
          />
        </Field>
      </div>

      <Field label="Notas de cata (del paquete)" htmlFor="coffee.tastingNotes-input">
        <Controller
          name="coffee.tastingNotes"
          control={control}
          render={({ field }) => (
            <TagInput
              id="coffee.tastingNotes-input"
              value={field.value ?? []}
              onChange={field.onChange}
              placeholder="Chocolate, caramelo…"
            />
          )}
        />
      </Field>
    </fieldset>
  );
}
