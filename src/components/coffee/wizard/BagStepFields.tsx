"use client";

import {
  BagDateField,
  BagEstimatedDoseField,
  BagInventoryModeField,
  BagLotLabelField,
  BagPackageWeightField,
  BagStatusField,
  type BagFieldProps,
} from "../bagFields";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// The wizard's grouping of the blocks in ../bagFields — one step's worth
// each. Every bag here is being created, so status is always derived from
// the opened date rather than picked.
export type BagStepProps = BagFieldProps;

// Complete mode, step 1: every bag date.
export function BagDatesFields({ register, errors }: BagStepProps) {
  const dict = useDictionary();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BagDateField register={register} errors={errors} name="roastDate" label={dict.coffees.roastDate} />
        <BagDateField register={register} name="purchaseDate" label={dict.coffees.purchaseDate} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BagDateField register={register} name="openedAt" label={dict.coffees.openedDate} />
        <BagDateField register={register} name="firstBrewAt" label={dict.coffees.firstBrewDate} />
      </div>
      <BagDateField
        register={register}
        name="finishedAt"
        label={dict.coffees.finishedDate}
        className="sm:max-w-[calc(50%-0.5rem)]"
      />
    </div>
  );
}

// Complete mode, step 2: bag status + package weight.
export function BagConditionFields({ register, watch, errors }: BagStepProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BagStatusField register={register} watch={watch} auto />
      <BagPackageWeightField register={register} errors={errors} />
    </div>
  );
}

// Complete mode, step 3: inventory mode, estimated dose, lot label.
export function BagInventoryFields({ register }: BagStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BagInventoryModeField register={register} />
        <BagEstimatedDoseField register={register} />
      </div>
      <BagLotLabelField register={register} />
    </div>
  );
}

// Basic mode's only bag step: purchase/opened dates, status, weight, inventory mode.
export function BagBasicModeFields({ register, watch, errors }: BagStepProps) {
  const dict = useDictionary();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BagDateField register={register} name="purchaseDate" label={dict.coffees.purchaseDate} />
        <BagDateField register={register} name="openedAt" label={dict.coffees.openedDate} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BagStatusField register={register} watch={watch} auto />
        <BagPackageWeightField register={register} errors={errors} />
      </div>
      <BagInventoryModeField register={register} />
    </div>
  );
}
