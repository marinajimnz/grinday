import Link from "next/link";
import { Library, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listCoffees } from "@/features/coffees/queries";
import { CoffeeCard } from "@/components/coffee/CoffeeCard";
import { CoffeeFilters } from "@/components/coffee/CoffeeFilters";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function CoffeesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const process = typeof params.process === "string" ? params.process : undefined;
  const roastLevel =
    typeof params.roastLevel === "string" ? params.roastLevel : undefined;
  const bagStatus =
    typeof params.bagStatus === "string" ? params.bagStatus : undefined;

  const supabase = await createClient();
  const coffees = await listCoffees(supabase, { q, process, roastLevel, bagStatus });
  const hasFilters = Boolean(q || process || roastLevel || bagStatus);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Cafés</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Biblioteca, búsqueda, filtros, bolsas e inventario.
          </p>
        </div>
        <Link
          href="/coffees/new"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-input bg-ink px-4 text-sm font-medium text-surface"
        >
          <Plus aria-hidden className="size-4" />
          Añadir café
        </Link>
      </div>

      <div className="mt-6">
        <CoffeeFilters />
      </div>

      <div className="mt-6">
        {coffees.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coffees.map((coffee) => (
              <CoffeeCard key={coffee.id} coffee={coffee} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Library}
            title={hasFilters ? "Sin resultados" : "Todavía no hay ningún café"}
            description={
              hasFilters
                ? "Prueba a cambiar la búsqueda o quitar algún filtro."
                : "Añade tu primer café, manualmente o fotografiando el paquete (próximamente)."
            }
            action={
              !hasFilters ? (
                <Link
                  href="/coffees/new"
                  className="mt-2 inline-flex min-h-11 items-center rounded-input bg-ink px-4 text-sm font-medium text-surface"
                >
                  Añadir café
                </Link>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
