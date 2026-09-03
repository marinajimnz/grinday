"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Field, inputClassName } from "@/components/ui/Field";
import { BAG_STATUSES, INVENTORY_MODES } from "@/features/coffees/constants";
import type { z } from "zod";
import type { bagFieldsSchema } from "@/lib/validation/coffees";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// See CoffeeStepFields for why register is loosely typed.
export type BagStepProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  errors?: FieldErrors<z.infer<typeof bagFieldsSchema>>;
};

function BagStatusSelect({ register }: Pick<BagStepProps, "register">) {
  const dict = useDictionary();
  return (
    <select id="bag.status" className={inputClassName} {...register("bag.status")}>
      {BAG_STATUSES.map((status) => (
        <option key={status} value={status}>
          {dict.enums.bagStatus[status]}
        </option>
      ))}
    </select>
  );
}

function InventoryModeSelect({ register }: Pick<BagStepProps, "register">) {
  const dict = useDictionary();
  return (
    <select id="bag.inventoryMode" className={inputClassName} {...register("bag.inventoryMode")}>
      {INVENTORY_MODES.map((mode) => (
        <option key={mode} value={mode}>
          {dict.enums.inventoryMode[mode]}
        </option>
      ))}
    </select>
  );
}

function PackageWeightField({ register, errors }: BagStepProps) {
  const dict = useDictionary();
  return (
    <Field
      label={dict.coffees.packageWeight}
      htmlFor="bag.packageWeightG"
      hint={dict.coffees.packageWeightHint}
      error={errors?.packageWeightG?.message}
    >
      <input
        id="bag.packageWeightG"
        type="number"
        className={inputClassName}
        {...register("bag.packageWeightG", { valueAsNumber: true })}
      />
    </Field>
  );
}

// Complete mode, step 1: every bag date.
export function BagDatesFields({ register, errors }: BagStepProps) {
  const dict = useDictionary();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={dict.coffees.roastDate} htmlFor="bag.roastDate" error={errors?.roastDate?.message}>
          <input id="bag.roastDate" type="date" className={inputClassName} {...register("bag.roastDate")} />
        </Field>
        <Field label={dict.coffees.purchaseDate} htmlFor="bag.purchaseDate">
          <input id="bag.purchaseDate" type="date" className={inputClassName} {...register("bag.purchaseDate")} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={dict.coffees.openedDate} htmlFor="bag.openedAt">
          <input id="bag.openedAt" type="date" className={inputClassName} {...register("bag.openedAt")} />
        </Field>
        <Field label={dict.coffees.firstBrewDate} htmlFor="bag.firstBrewAt">
          <input id="bag.firstBrewAt" type="date" className={inputClassName} {...register("bag.firstBrewAt")} />
        </Field>
      </div>
      <Field label={dict.coffees.finishedDate} htmlFor="bag.finishedAt">
        <input
          id="bag.finishedAt"
          type="date"
          className={`${inputClassName} sm:max-w-[calc(50%-0.5rem)]`}
          {...register("bag.finishedAt")}
        />
      </Field>
    </div>
  );
}

// Complete mode, step 2: bag status + package weight.
export function BagConditionFields({ register, errors }: BagStepProps) {
  const dict = useDictionary();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label={dict.coffees.bagStatus} htmlFor="bag.status">
        <BagStatusSelect register={register} />
      </Field>
      <PackageWeightField register={register} errors={errors} />
    </div>
  );
}

// Complete mode, step 3: inventory mode, estimated dose, lot label.
export function BagInventoryFields({ register }: BagStepProps) {
  const dict = useDictionary();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label={dict.coffees.inventoryMode}
          htmlFor="bag.inventoryMode"
          hint={dict.coffees.inventoryModeHint}
        >
          <InventoryModeSelect register={register} />
        </Field>
        <Field
          label={dict.coffees.estimatedDose}
          htmlFor="bag.estimatedDoseG"
          hint={dict.coffees.estimatedDoseHint}
        >
          <input
            id="bag.estimatedDoseG"
            type="number"
            className={inputClassName}
            {...register("bag.estimatedDoseG", { valueAsNumber: true })}
          />
        </Field>
      </div>
      <Field label={dict.coffees.lotLabel} htmlFor="bag.lotLabel" hint={dict.coffees.lotLabelHint}>
        <input id="bag.lotLabel" className={inputClassName} {...register("bag.lotLabel")} />
      </Field>
    </div>
  );
}

// Basic mode's only bag step: purchase/opened dates, status, weight, inventory mode.
export function BagBasicModeFields({ register, errors }: BagStepProps) {
  const dict = useDictionary();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={dict.coffees.purchaseDate} htmlFor="bag.purchaseDate">
          <input id="bag.purchaseDate" type="date" className={inputClassName} {...register("bag.purchaseDate")} />
        </Field>
        <Field label={dict.coffees.openedDate} htmlFor="bag.openedAt">
          <input id="bag.openedAt" type="date" className={inputClassName} {...register("bag.openedAt")} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={dict.coffees.bagStatus} htmlFor="bag.status">
          <BagStatusSelect register={register} />
        </Field>
        <PackageWeightField register={register} errors={errors} />
      </div>
      <Field label={dict.coffees.inventoryMode} htmlFor="bag.inventoryMode" hint={dict.coffees.inventoryModeHint}>
        <InventoryModeSelect register={register} />
      </Field>
    </div>
  );
}
