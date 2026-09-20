"use client";

import type { z } from "zod";
import type { coffeeFieldsSchema } from "@/lib/validation/coffees";
import {
  CoffeeAltitudeFields,
  CoffeeNameAndRoasterFields,
  CoffeeOriginFields,
  CoffeeProcessAndRoastFields,
  CoffeeTastingNotesField,
  CoffeeVarietiesField,
  type CoffeeFieldProps,
} from "./coffeeFields";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export type CoffeeFormValues = { coffee: z.infer<typeof coffeeFieldsSchema> };

// Every field of a coffee on one sheet, for editing one that already
// exists. The blocks come from ../coffeeFields, shared with the wizard,
// which asks for the same fields a step at a time; all this decides is the
// order they appear in.
export function CoffeeFieldsFieldset({ register, control, errors }: CoffeeFieldProps) {
  const dict = useDictionary();

  return (
    <fieldset className="space-y-4">
      <legend className="font-display text-lg text-ink">{dict.coffees.theCoffee}</legend>

      <CoffeeNameAndRoasterFields register={register} errors={errors} />
      <CoffeeOriginFields register={register} />
      <CoffeeVarietiesField register={register} control={control} />
      <CoffeeProcessAndRoastFields register={register} errors={errors} />
      <CoffeeAltitudeFields register={register} errors={errors} />
      <CoffeeTastingNotesField register={register} control={control} />
    </fieldset>
  );
}
