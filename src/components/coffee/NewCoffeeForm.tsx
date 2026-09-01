"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CoffeeFieldsFieldset } from "./CoffeeFieldsFieldset";
import { BagFieldsFieldset } from "./BagFieldsFieldset";
import { bagFieldsSchema, coffeeFieldsSchema } from "@/lib/validation/coffees";
import {
  createCoffeeAndBagAction,
  findSimilarCoffeeAction,
} from "@/features/coffees/actions";

const formSchema = z.object({
  coffee: coffeeFieldsSchema,
  bag: bagFieldsSchema,
});

type FormValues = z.infer<typeof formSchema>;

export function NewCoffeeForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [conflict, setConflict] = useState<{
    id: string;
    name: string;
    roaster: string;
    values: FormValues;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      coffee: { name: "", roaster: "", varieties: [], tastingNotes: [] },
      bag: { inventoryMode: "none", status: "sealed" },
    },
  });

  async function submitCoffee(values: FormValues, existingCoffeeId?: string) {
    setFormError(null);
    const result = await createCoffeeAndBagAction({
      coffee: values.coffee,
      bag: values.bag,
      existingCoffeeId,
    });
    if (!result.success) {
      setFormError(result.message);
      return;
    }
    router.push(`/coffees/${result.data.coffeeId}`);
  }

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const match = await findSimilarCoffeeAction({
        name: values.coffee.name,
        roaster: values.coffee.roaster,
      });
      if (match) {
        setConflict({ ...match, values });
        return;
      }
      await submitCoffee(values);
    });
  }

  if (conflict) {
    return (
      <div className="rounded-card border border-border bg-surface p-6">
        <p className="font-display text-lg text-ink">
          Ya tienes “{conflict.name}” de {conflict.roaster}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          ¿Es una bolsa nueva del mismo café, o quieres crear un café distinto
          con este nombre de todas formas?
        </p>
        {formError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {formError}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(() => submitCoffee(conflict.values, conflict.id))
            }
            className="min-h-11 flex-1 rounded-input bg-ink px-4 text-sm font-medium text-surface"
          >
            Añadir esta bolsa a “{conflict.name}”
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => submitCoffee(conflict.values))}
            className="min-h-11 flex-1 rounded-input border border-border px-4 text-sm font-medium text-ink"
          >
            Crear café nuevo de todas formas
          </button>
        </div>
        <button
          type="button"
          onClick={() => setConflict(null)}
          className="mt-3 text-sm text-ink-muted underline"
        >
          Volver a editar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <CoffeeFieldsFieldset register={register} control={control} errors={errors.coffee} />
      <BagFieldsFieldset register={register} control={control} errors={errors.bag} />

      {formError && (
        <p role="alert" className="text-sm text-red-700">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 w-full rounded-input bg-ink px-4 text-sm font-medium text-surface disabled:opacity-60 sm:w-auto"
      >
        {isPending ? "Guardando..." : "Guardar café"}
      </button>
    </form>
  );
}
