"use client";

import { Controller, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { Field, inputClassName } from "@/components/ui/Field";
import { TagInput } from "@/components/ui/TagInput";
import { ROAST_LEVELS } from "@/features/coffees/constants";
import type { z } from "zod";
import type { coffeeFieldsSchema } from "@/lib/validation/coffees";
import { useDictionary } from "@/components/i18n/LocaleProvider";

/**
 * Every field of a coffee, written once.
 *
 * Two screens ask for a coffee — the wizard at /coffees/new, a step at a
 * time, and the edit form all at once — and they used to carry their own
 * copy of the same eleven fields, down to identical markup. A field added
 * or a label corrected in one was silently missing from the other.
 *
 * So the blocks live here and the two screens only decide the order and
 * the grouping. That difference is real: the wizard is paced, the edit
 * form is a single sheet.
 */

// Loosely typed on purpose: these blocks are reused by forms whose root
// shape differs (the wizard's create form, the edit form), and RHF's
// generics don't unify cleanly across those without heavy casting. Each
// parent's own zod schema is the real source of truth for what it submits.
export type CoffeeFieldProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control?: any;
  errors?: FieldErrors<z.infer<typeof coffeeFieldsSchema>>;
};

export function CoffeeNameAndRoasterFields({ register, errors }: CoffeeFieldProps) {
  const dict = useDictionary();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label={dict.coffees.name} htmlFor="coffee.name" error={errors?.name?.message}>
        <input id="coffee.name" className={inputClassName} {...register("coffee.name")} />
      </Field>
      <Field label={dict.coffees.roaster} htmlFor="coffee.roaster" error={errors?.roaster?.message}>
        <input id="coffee.roaster" className={inputClassName} {...register("coffee.roaster")} />
      </Field>
    </div>
  );
}

export function CoffeeOriginFields({ register }: CoffeeFieldProps) {
  const dict = useDictionary();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={dict.coffees.country} htmlFor="coffee.country">
          <input id="coffee.country" className={inputClassName} {...register("coffee.country")} />
        </Field>
        <Field label={dict.coffees.region} htmlFor="coffee.region">
          <input id="coffee.region" className={inputClassName} {...register("coffee.region")} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={dict.coffees.farm} htmlFor="coffee.farm">
          <input id="coffee.farm" className={inputClassName} {...register("coffee.farm")} />
        </Field>
        <Field label={dict.coffees.producer} htmlFor="coffee.producer">
          <input id="coffee.producer" className={inputClassName} {...register("coffee.producer")} />
        </Field>
      </div>
    </div>
  );
}

export function CoffeeRoastLevelField({ register, errors }: CoffeeFieldProps) {
  const dict = useDictionary();
  return (
    <Field label={dict.coffees.roastLevel} htmlFor="coffee.roastLevel" error={errors?.roastLevel?.message}>
      <select
        id="coffee.roastLevel"
        className={inputClassName}
        defaultValue=""
        {...register("coffee.roastLevel")}
      >
        <option value="">{dict.coffees.notSpecified}</option>
        {ROAST_LEVELS.map((level) => (
          <option key={level} value={level}>
            {dict.enums.roastLevel[level]}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CoffeeProcessAndRoastFields({ register, errors }: CoffeeFieldProps) {
  const dict = useDictionary();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label={dict.coffees.process} htmlFor="coffee.process">
        <input
          id="coffee.process"
          className={inputClassName}
          placeholder={dict.coffees.processPlaceholder}
          {...register("coffee.process")}
        />
      </Field>
      <CoffeeRoastLevelField register={register} errors={errors} />
    </div>
  );
}

export function CoffeeVarietiesField({ control }: CoffeeFieldProps) {
  const dict = useDictionary();
  return (
    <Field label={dict.coffees.varieties} htmlFor="coffee.varieties-input">
      <Controller
        name="coffee.varieties"
        control={control}
        render={({ field }) => (
          <TagInput
            id="coffee.varieties-input"
            value={field.value ?? []}
            onChange={field.onChange}
            placeholder={dict.coffees.varietiesPlaceholder}
          />
        )}
      />
    </Field>
  );
}

export function CoffeeTastingNotesField({ control }: CoffeeFieldProps) {
  const dict = useDictionary();
  return (
    <Field label={dict.coffees.tastingNotes} htmlFor="coffee.tastingNotes-input">
      <Controller
        name="coffee.tastingNotes"
        control={control}
        render={({ field }) => (
          <TagInput
            id="coffee.tastingNotes-input"
            value={field.value ?? []}
            onChange={field.onChange}
            placeholder={dict.coffees.tastingNotesPlaceholder}
          />
        )}
      />
    </Field>
  );
}

export function CoffeeAltitudeFields({ register, errors }: CoffeeFieldProps) {
  const dict = useDictionary();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label={dict.coffees.altitudeMin} htmlFor="coffee.altitudeMinM" error={errors?.altitudeMinM?.message}>
        <input
          id="coffee.altitudeMinM"
          type="number"
          className={inputClassName}
          {...register("coffee.altitudeMinM", { valueAsNumber: true })}
        />
      </Field>
      <Field label={dict.coffees.altitudeMax} htmlFor="coffee.altitudeMaxM" error={errors?.altitudeMaxM?.message}>
        <input
          id="coffee.altitudeMaxM"
          type="number"
          className={inputClassName}
          {...register("coffee.altitudeMaxM", { valueAsNumber: true })}
        />
      </Field>
    </div>
  );
}
