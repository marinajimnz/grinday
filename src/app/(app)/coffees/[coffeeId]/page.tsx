import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft } from "lucide-react";
import { getCoffeeWithBags, listMediaForBags } from "@/features/coffees/queries";
import { listAttemptsForCoffee } from "@/features/attempts/queries";
import { CoffeeDetailPanel } from "@/components/coffee/CoffeeDetailPanel";
import { BagAccordionItem } from "@/components/coffee/BagAccordionItem";
import { AddBagPanel } from "@/components/coffee/AddBagPanel";
import { CoffeeTabs } from "@/components/coffee/CoffeeTabs";
import { AttemptsTimeline } from "@/components/attempt/AttemptsTimeline";
import { EvolutionTree } from "@/components/attempt/EvolutionTree";
import { RecipeCard } from "@/components/attempt/RecipeCard";
import { PrepareWithRecipeButton } from "@/components/brew/PrepareWithRecipeButton";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

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
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const attempts = await listAttemptsForCoffee(supabase, coffeeId);
  const preferredAttempt = coffee.preferred_attempt_id
    ? (attempts.find((a) => a.id === coffee.preferred_attempt_id) ?? null)
    : null;

  const targetBag =
    bags.find((b) => b.status === "open") ?? bags.find((b) => b.status === "sealed") ?? bags[0];

  const mediaByBag = await listMediaForBags(
    supabase,
    bags.map((b) => b.id),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <Link
        href="/coffees"
        className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-ink-muted"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {dict.common.back}
      </Link>

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
                      {dict.coffees.logManual}
                    </Link>
                    <PrepareWithRecipeButton
                      coffeeId={coffee.id}
                      coffeeBagId={targetBag.id}
                      coffeeName={coffee.name}
                      roaster={coffee.roaster}
                      sourceAttempt={null}
                      className="inline-flex min-h-11 items-center rounded-input bg-ink px-4 text-sm font-medium text-surface"
                    >
                      {dict.dashboard.prepare}
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
            <EvolutionTree
              attempts={attempts}
              preferredAttemptId={coffee.preferred_attempt_id}
              dict={dict}
              locale={locale}
            />
          }
          bagsContent={
            <div>
              <div className="mb-4 flex items-center justify-end">
                <AddBagPanel coffeeId={coffee.id} />
              </div>
              <div className="space-y-3">
                {bags.length ? (
                  bags.map((bag) => (
                    <BagAccordionItem key={bag.id} bag={bag} media={mediaByBag.get(bag.id) ?? []} />
                  ))
                ) : (
                  <p className="text-sm text-ink-muted">{dict.coffees.noBagsYet}</p>
                )}
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
