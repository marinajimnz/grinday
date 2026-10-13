import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft } from "lucide-react";
import {
  countCupsByBag,
  getCoffeeWithBags,
  listMediaForBags,
  sharedCoverFromMedia,
} from "@/features/coffees/queries";
import { listAttemptsForCoffee } from "@/features/attempts/queries";
import { CoffeeDetailPanel } from "@/components/coffee/CoffeeDetailPanel";
import { BagAccordionItem } from "@/components/coffee/BagAccordionItem";
import { AddBagPanel } from "@/components/coffee/AddBagPanel";
import { CoffeeTabs } from "@/components/coffee/CoffeeTabs";
import { AttemptsTimeline } from "@/components/attempt/AttemptsTimeline";
import { RecipeCard } from "@/components/attempt/RecipeCard";
import { Button } from "@/components/ui/Button";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { titleFrom } from "@/lib/i18n/metadata";

export const generateMetadata = titleFrom((d) => d.pageTitles.coffee);

export default async function CoffeeDetailPage({
  params,
}: {
  params: Promise<{ coffeeId: string }>;
}) {
  const { coffeeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const result = await getCoffeeWithBags(supabase, coffeeId, user.id);

  if (!result) notFound();
  const { coffee, bags } = result;
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const attempts = await listAttemptsForCoffee(supabase, coffeeId, user.id);
  const preferredAttempt = coffee.preferred_attempt_id
    ? (attempts.find((a) => a.id === coffee.preferred_attempt_id) ?? null)
    : null;

  const targetBag =
    bags.find((b) => b.status === "open") ?? bags.find((b) => b.status === "sealed") ?? bags[0];

  const bagIds = bags.map((b) => b.id);
  const [mediaByBag, cupsByBag] = await Promise.all([
    listMediaForBags(supabase, bagIds),
    countCupsByBag(supabase, bagIds),
  ]);
  const allMedia = [...mediaByBag.values()].flat();

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
            userId={user?.id ?? ""}
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
                    <Button href={`/attempts/new?coffeeBagId=${targetBag.id}`} variant="secondary">
                      {dict.coffees.logManual}
                    </Button>
                    <Button href="/brew/new">{dict.dashboard.prepare}</Button>
                  </>
                )}
              </div>
              <AttemptsTimeline attempts={attempts} />
            </div>
          }
          bagsContent={
            <div>
              <div className="mb-4 flex items-center justify-end">
                <AddBagPanel coffeeId={coffee.id} />
              </div>
              <div className="space-y-3">
                {bags.length ? (
                  bags.map((bag) => (
                    <BagAccordionItem
                      key={bag.id}
                      bag={bag}
                      media={mediaByBag.get(bag.id) ?? []}
                      sharedPhoto={sharedCoverFromMedia(bag.id, allMedia)}
                      cups={cupsByBag.get(bag.id) ?? 0}
                    />
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
