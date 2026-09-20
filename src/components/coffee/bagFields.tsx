"use client";

import type { FieldErrors, UseFormRegister, UseFormWatch } from "react-hook-form";
import { Field, inputClassName } from "@/components/ui/Field";
import { BAG_STATUSES, INVENTORY_MODES } from "@/features/coffees/constants";
import { cn } from "@/lib/cn";
import type { z } from "zod";
import type { bagFieldsSchema } from "@/lib/validation/coffees";
import { useDictionary } from "@/components/i18n/LocaleProvider";

/**
 * Every field of a bag, written once — same reasoning as coffeeFields.
 *
 * The two screens diverge more here than they do for a coffee, and the
 * difference matters: a bag being created can only be sealed or open, so
 * its status is derived from the opened date; a bag being edited may
 * already be finished or archived, states no date field can express, so it
 * keeps a picker. BagStatusField holds both, and the caller says which.
 */

// See coffeeFields for why register/watch are loosely typed.
export type BagFieldProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch?: UseFormWatch<any>;
  errors?: FieldErrors<z.infer<typeof bagFieldsSchema>>;
};

export type BagDateName = "roastDate" | "purchaseDate" | "openedAt" | "firstBrewAt" | "finishedAt";

export function BagDateField({
  register,
  errors,
  name,
  label,
  className,
}: BagFieldProps & { name: BagDateName; label: string; className?: string }) {
  return (
    <Field label={label} htmlFor={`bag.${name}`} error={errors?.[name]?.message}>
      <input
        id={`bag.${name}`}
        type="date"
        className={cn(inputClassName, className)}
        {...register(`bag.${name}`)}
      />
    </Field>
  );
}

/**
 * Status is either derived or chosen — never both. `auto` means this form
 * is creating the bag, so there is no history to express and the opened
 * date decides it.
 */
export function BagStatusField({ register, watch, auto }: BagFieldProps & { auto: boolean }) {
  const dict = useDictionary();
  const computed = watch?.("bag.openedAt") ? "open" : "sealed";
  return (
    <Field
      label={dict.coffees.bagStatus}
      htmlFor="bag.status"
      hint={auto ? dict.coffees.bagStatusAutoHint : undefined}
    >
      {auto ? (
        <p id="bag.status" className={`${inputClassName} flex items-center text-ink-muted`}>
          {dict.enums.bagStatus[computed]}
        </p>
      ) : (
        <select id="bag.status" className={inputClassName} {...register("bag.status")}>
          {BAG_STATUSES.map((status) => (
            <option key={status} value={status}>
              {dict.enums.bagStatus[status]}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function BagPackageWeightField({ register, errors }: BagFieldProps) {
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

export function BagInventoryModeField({ register }: BagFieldProps) {
  const dict = useDictionary();
  return (
    <Field label={dict.coffees.inventoryMode} htmlFor="bag.inventoryMode" hint={dict.coffees.inventoryModeHint}>
      <select id="bag.inventoryMode" className={inputClassName} {...register("bag.inventoryMode")}>
        {INVENTORY_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {dict.enums.inventoryMode[mode]}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function BagEstimatedDoseField({ register }: BagFieldProps) {
  const dict = useDictionary();
  return (
    <Field label={dict.coffees.estimatedDose} htmlFor="bag.estimatedDoseG" hint={dict.coffees.estimatedDoseHint}>
      <input
        id="bag.estimatedDoseG"
        type="number"
        className={inputClassName}
        {...register("bag.estimatedDoseG", { valueAsNumber: true })}
      />
    </Field>
  );
}

export function BagLotLabelField({ register }: BagFieldProps) {
  const dict = useDictionary();
  return (
    <Field label={dict.coffees.lotLabel} htmlFor="bag.lotLabel" hint={dict.coffees.lotLabelHint}>
      <input id="bag.lotLabel" className={inputClassName} {...register("bag.lotLabel")} />
    </Field>
  );
}
