import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCoffeeWithBags } from "@/features/coffees/queries";
import { listAttemptsForCoffee } from "@/features/attempts/queries";
import { CoffeeDetailPanel } from "@/components/coffee/CoffeeDetailPanel";
import { BagListItem } from "@/components/coffee/BagListItem";
import { AddBagPanel } from "@/components/coffee/AddBagPanel";
import { CoffeeTabs } from "@/components/coffee/CoffeeTabs";
import { AttemptsTimeline } from "@/components/attempt/AttemptsTimeline";
import { EvolutionTree } from "@/components/attempt/EvolutionTree";
import { RecipeCard } from "@/components/attempt/RecipeCard";
import { PrepareWithRecipeButton } from "@/components/brew/PrepareWithRecipeButton";

export default async function CoffeeDetailPage({
  params,
}: {
  params: Promise<{ coffeeId: string }>;
}) {
  const { coffeeId } = await params;
  const supabase = await createClient();
  const result = await getCoffeeWithBags(supabase, coffeeId);

  if (!result) notFound();
  const { coffee, bags } = result;

  const attempts = await listAttemptsForCoffee(supabase, coffeeId);
  const preferredAttempt = coffee.preferred_attempt_id
    ? (attempts.find((a) => a.id === coffee.preferred_attempt_id) ?? null)
    : null;

  const targetBag =
    bags.find((b) => b.status === "open") ?? bags.find((b) => b.status === "sealed") ?? bags[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <CoffeeDetailPanel coffee={coffee} />

      {preferredAttempt && targetBag && (
        <div className="mt-6">
          <RecipeCard
            attempt={preferredAttempt}
            coffeeId={coffee.id}
            coffeeName={coffee.name}
            roaster={coffee.roaster}
            targetBagId={targetBag.id}
          />
        </div>
      )}

      <div className="mt-8">
        <CoffeeTabs
          attemptsContent={
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                {targetBag && (
                  <>
                    <Link
                      href={`/attempts/new?coffeeBagId=${targetBag.id}`}
                      className="inline-flex min-h-11 items-center rounded-input border border-border px-4 text-sm font-medium text-ink"
                    >
                      Registrar manual
                    </Link>
                    <PrepareWithRecipeButton
                      coffeeId={coffee.id}
                      coffeeBagId={targetBag.id}
                      coffeeName={coffee.name}
                      roaster={coffee.roaster}
                      sourceAttempt={null}
                      className="inline-flex min-h-11 items-center rounded-input bg-ink px-4 text-sm font-medium text-surface"
                    >
                      Preparar
                    </PrepareWithRecipeButton>
                  </>
                )}
              </div>
              <AttemptsTimeline
                attempts={attempts}
                preferredAttemptId={coffee.preferred_attempt_id}
              />
            </div>
          }
          evolutionContent={
            <EvolutionTree attempts={attempts} preferredAttemptId={coffee.preferred_attempt_id} />
          }
          bagsContent={
            <div>
              <div className="mb-4 flex items-center justify-end">
                <AddBagPanel coffeeId={coffee.id} />
              </div>
              <div className="space-y-3">
                {bags.length ? (
                  bags.map((bag) => <BagListItem key={bag.id} bag={bag} />)
                ) : (
                  <p className="text-sm text-ink-muted">
                    Todavía no hay ninguna bolsa registrada para este café.
                  </p>
                )}
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
