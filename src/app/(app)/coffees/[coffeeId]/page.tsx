import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCoffeeWithBags } from "@/features/coffees/queries";
import { CoffeeDetailPanel } from "@/components/coffee/CoffeeDetailPanel";
import { BagListItem } from "@/components/coffee/BagListItem";
import { AddBagPanel } from "@/components/coffee/AddBagPanel";

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <CoffeeDetailPanel coffee={coffee} />

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">Bolsas</h2>
          <AddBagPanel coffeeId={coffee.id} />
        </div>

        <div className="mt-4 space-y-3">
          {bags.length ? (
            bags.map((bag) => <BagListItem key={bag.id} bag={bag} />)
          ) : (
            <p className="text-sm text-ink-muted">
              Todavía no hay ninguna bolsa registrada para este café.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
