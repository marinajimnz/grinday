"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Field, inputClassName } from "@/components/ui/Field";
import {
  BAG_STATUSES,
  BAG_STATUS_LABELS,
  INVENTORY_MODES,
  INVENTORY_MODE_LABELS,
} from "@/features/coffees/constants";
import type { z } from "zod";
import type { bagFieldsSchema } from "@/lib/validation/coffees";

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
  return (
    <fieldset className="space-y-4">
      <legend className="font-display text-lg text-ink">La bolsa</legend>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Fecha de tueste" htmlFor="bag.roastDate" error={errors?.roastDate?.message}>
          <input id="bag.roastDate" type="date" className={inputClassName} {...register("bag.roastDate")} />
        </Field>
        <Field label="Fecha de compra" htmlFor="bag.purchaseDate">
          <input id="bag.purchaseDate" type="date" className={inputClassName} {...register("bag.purchaseDate")} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Fecha de apertura" htmlFor="bag.openedAt">
          <input id="bag.openedAt" type="date" className={inputClassName} {...register("bag.openedAt")} />
        </Field>
        <Field label="Primer intento" htmlFor="bag.firstBrewAt">
          <input id="bag.firstBrewAt" type="date" className={inputClassName} {...register("bag.firstBrewAt")} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Fecha de finalización" htmlFor="bag.finishedAt">
          <input id="bag.finishedAt" type="date" className={inputClassName} {...register("bag.finishedAt")} />
        </Field>
        <Field label="Estado de la bolsa" htmlFor="bag.status">
          <select id="bag.status" className={inputClassName} {...register("bag.status")}>
            {BAG_STATUSES.map((status) => (
              <option key={status} value={status}>
                {BAG_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Peso del paquete (g)"
          htmlFor="bag.packageWeightG"
          hint="Opcional"
          error={errors?.packageWeightG?.message}
        >
          <input
            id="bag.packageWeightG"
            type="number"
            className={inputClassName}
            {...register("bag.packageWeightG", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Cantidad restante (g)" htmlFor="bag.remainingG" hint="Opcional">
          <input
            id="bag.remainingG"
            type="number"
            className={inputClassName}
            {...register("bag.remainingG", { valueAsNumber: true })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Inventario"
          htmlFor="bag.inventoryMode"
          hint="Si no usas báscula, elige «Aproximado por shots»"
        >
          <select id="bag.inventoryMode" className={inputClassName} {...register("bag.inventoryMode")}>
            {INVENTORY_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {INVENTORY_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dosis estimada (g)" htmlFor="bag.estimatedDoseG" hint="Solo si usas modo aproximado">
          <input
            id="bag.estimatedDoseG"
            type="number"
            className={inputClassName}
            {...register("bag.estimatedDoseG", { valueAsNumber: true })}
          />
        </Field>
      </div>

      <Field label="Lote / cosecha" htmlFor="bag.lotLabel" hint="Opcional, si figura en el paquete">
        <input id="bag.lotLabel" className={inputClassName} {...register("bag.lotLabel")} />
      </Field>
    </fieldset>
  );
}
