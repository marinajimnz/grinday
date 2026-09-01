import Link from "next/link";
import { Coffee, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/features/dashboard/queries";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecipeCard } from "@/components/attempt/RecipeCard";
import { PrepareWithRecipeButton } from "@/components/brew/PrepareWithRecipeButton";
import { DashboardSnapshotWriter } from "@/components/dashboard/DashboardSnapshotWriter";

export default async function DashboardPage() {
  const supabase = await createClient();
  const data = await getDashboardData(supabase);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">Inicio</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Tu café activo, último intento y accesos rápidos.
      </p>

      <div className="mt-8">
        {!data.hasAnyCoffee ? (
          <EmptyState
            icon={Coffee}
            title="Todavía no hay ningún café en tu diario"
            description="Añade tu primer café para empezar a registrar intentos."
            action={
              <Link
                href="/coffees/new"
                className="mt-2 inline-flex min-h-11 items-center rounded-input bg-ink px-4 font-display text-base tracking-wide text-surface"
              >
                Añadir café
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            <DashboardSnapshotWriter
              coffeeId={data.activeCoffee.id}
              coffeeName={data.activeCoffee.name}
              roaster={data.activeCoffee.roaster}
              lastAttemptNo={data.lastAttempt?.attempt_no}
              lastAttemptRating={data.lastAttempt?.overall_rating ?? undefined}
            />
            <div className="rounded-card border border-border bg-surface p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Café activo
              </p>
              <p className="mt-1 text-sm text-ink-muted">{data.activeCoffee.roaster}</p>
              <Link href={`/coffees/${data.activeCoffee.id}`} className="font-display text-2xl text-ink">
                {data.activeCoffee.name}
              </Link>

              {data.lastAttempt && (
                <Link
                  href={`/attempts/${data.lastAttempt.id}`}
                  className="mt-3 flex items-center gap-2 text-sm text-ink-muted"
                >
                  Último intento: #{data.lastAttempt.attempt_no}
                  {data.lastAttempt.overall_rating && (
                    <span className="flex items-center gap-0.5 text-ink">
                      <Star aria-hidden className="size-3.5 fill-coffee text-coffee" />
                      {data.lastAttempt.overall_rating}/5
                    </span>
                  )}
                </Link>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {data.targetBagId && (
                  <PrepareWithRecipeButton
                    coffeeId={data.activeCoffee.id}
                    coffeeBagId={data.targetBagId}
                    coffeeName={data.activeCoffee.name}
                    roaster={data.activeCoffee.roaster}
                    sourceAttempt={data.preferredAttempt}
                    className="min-h-11 rounded-input bg-ink px-4 text-sm font-medium text-surface"
                  >
                    {data.preferredAttempt ? "Preparar con esta receta" : "Preparar"}
                  </PrepareWithRecipeButton>
                )}
                <Link
                  href="/coffees"
                  className="inline-flex min-h-11 items-center rounded-input border border-border px-4 text-sm font-medium text-ink"
                >
                  Ver cafés
                </Link>
              </div>
            </div>

            {data.preferredAttempt && (
              <RecipeCard
                attempt={data.preferredAttempt}
                coffeeId={data.activeCoffee.id}
                coffeeName={data.activeCoffee.name}
                roaster={data.activeCoffee.roaster}
                targetBagId={data.targetBagId ?? data.preferredAttempt.coffee_bag_id}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
