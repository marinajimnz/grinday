import { Coffee } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listBrewableCoffees } from "@/features/attempts/queries";
import { BrewPicker } from "@/components/brew/BrewPicker";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function BrewNewPage() {
  const supabase = await createClient();
  const coffees = await listBrewableCoffees(supabase);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">Preparar</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Elige el café. Si tiene receta preferida, partimos de ahí.
      </p>

      <div className="mt-8">
        {coffees.length ? (
          <BrewPicker coffees={coffees} />
        ) : (
          <EmptyState
            icon={Coffee}
            title="No hay ningún café listo para preparar"
            description="Añade un café con una bolsa sin terminar desde la biblioteca."
          />
        )}
      </div>
    </div>
  );
}
