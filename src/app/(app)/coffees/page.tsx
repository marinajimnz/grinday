import Link from "next/link";
import { Archive, Library, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listCoffees } from "@/features/coffees/queries";
import { CoffeeCard } from "@/components/coffee/CoffeeCard";
import { CoffeeFilters } from "@/components/coffee/CoffeeFilters";
import { EmptyState } from "@/components/ui/EmptyState";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

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
  const dict = getDictionary(await getLocale());

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">{dict.coffees.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{dict.coffees.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/inventory"
            aria-label={dict.coffees.inventory}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-input border border-border px-3 text-sm font-medium text-ink"
          >
            <Archive aria-hidden className="size-4" />
          </Link>
          <Link
            href="/coffees/new"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-input bg-ink px-4 font-display text-base tracking-wide text-surface"
          >
            <Plus aria-hidden className="size-4" />
            {dict.coffees.addCoffee}
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <CoffeeFilters />
      </div>

      <div className="mt-6">
        {coffees.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coffees.map((coffee) => (
              <CoffeeCard key={coffee.id} coffee={coffee} dict={dict} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Library}
            title={hasFilters ? dict.coffees.noResults : dict.coffees.noCoffeesYet}
            description={hasFilters ? dict.coffees.noResultsDescription : dict.coffees.noCoffeesDescription}
            action={
              !hasFilters ? (
                <Link
                  href="/coffees/new"
                  className="mt-2 inline-flex min-h-11 items-center rounded-input bg-ink px-4 font-display text-base tracking-wide text-surface"
                >
                  {dict.coffees.addCoffee}
                </Link>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
