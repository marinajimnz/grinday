"use client";

import type { z } from "zod";
import type { bagFieldsSchema } from "@/lib/validation/coffees";
import {
  BagDateField,
  BagEstimatedDoseField,
  BagInventoryModeField,
  BagLotLabelField,
  BagPackageWeightField,
  BagStatusField,
  type BagFieldProps,
} from "./bagFields";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export type BagFormValues = { bag: z.infer<typeof bagFieldsSchema> };

// Every field of a bag on one sheet. The blocks come from ./bagFields,
// shared with the wizard, which asks for the same fields a step at a time.
export function BagFieldsFieldset({
  register,
  errors,
  watch,
  autoStatus = false,
}: BagFieldProps & {
  // A brand-new bag (this form creating one) has no history yet, so status
  // is derived from the opened date instead of chosen — an existing bag
  // being edited keeps the manual picker (it may already be finished or
  // archived, states no date field here can express).
  autoStatus?: boolean;
}) {
  const dict = useDictionary();

  return (
    <fieldset className="space-y-4">
      <legend className="font-display text-lg text-ink">{dict.coffees.theBag}</legend>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BagDateField register={register} errors={errors} name="roastDate" label={dict.coffees.roastDate} />
        <BagDateField register={register} name="purchaseDate" label={dict.coffees.purchaseDate} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BagDateField register={register} name="openedAt" label={dict.coffees.openedDate} />
        <BagDateField register={register} name="firstBrewAt" label={dict.coffees.firstBrewDate} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BagDateField register={register} name="finishedAt" label={dict.coffees.finishedDate} />
        <BagStatusField register={register} watch={watch} auto={autoStatus} />
      </div>

      <BagPackageWeightField register={register} errors={errors} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BagInventoryModeField register={register} />
        <BagEstimatedDoseField register={register} />
      </div>

      <BagLotLabelField register={register} />
    </fieldset>
  );
}
