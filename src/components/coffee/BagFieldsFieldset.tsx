"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Field, inputClassName } from "@/components/ui/Field";
import { BAG_STATUSES, INVENTORY_MODES } from "@/features/coffees/constants";
import type { z } from "zod";
import type { bagFieldsSchema } from "@/lib/validation/coffees";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export type BagFormValues = { bag: z.infer<typeof bagFieldsSchema> };

// See CoffeeFieldsFieldset for why register/control are loosely typed.
export function BagFieldsFieldset({
  register,
  errors,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control?: any;
  errors?: FieldErrors<z.infer<typeof bagFieldsSchema>>;
}) {
  const dict = useDictionary();

  return (
    <fieldset className="space-y-4">
      <legend className="font-display text-lg text-ink">{dict.coffees.theBag}</legend>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={dict.coffees.finishedDate} htmlFor="bag.finishedAt">
          <input id="bag.finishedAt" type="date" className={inputClassName} {...register("bag.finishedAt")} />
        </Field>
        <Field label={dict.coffees.bagStatus} htmlFor="bag.status">
          <select id="bag.status" className={inputClassName} {...register("bag.status")}>
            {BAG_STATUSES.map((status) => (
              <option key={status} value={status}>
                {dict.enums.bagStatus[status]}
              </option>
            ))}
          </select>
        </Field>
      </div>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label={dict.coffees.inventoryMode}
          htmlFor="bag.inventoryMode"
          hint={dict.coffees.inventoryModeHint}
        >
          <select id="bag.inventoryMode" className={inputClassName} {...register("bag.inventoryMode")}>
            {INVENTORY_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {dict.enums.inventoryMode[mode]}
              </option>
            ))}
          </select>
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
    </fieldset>
  );
}
