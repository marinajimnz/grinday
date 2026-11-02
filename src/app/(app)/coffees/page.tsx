import Link from "next/link";
import { Library } from "lucide-react";
import { IconAnadir, IconArchivar, IconFavorita } from "@/components/icons/pencil-icons";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { listCoffees } from "@/features/coffees/queries";
import { CoffeeShelf } from "@/components/coffee/shelf/CoffeeShelf";
import { shelfCounts } from "@/features/coffees/shelf";
import { CoffeeFilters } from "@/components/coffee/CoffeeFilters";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { titleFrom } from "@/lib/i18n/metadata";

export const generateMetadata = titleFrom((d) => d.coffees.title);

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
  const user = await getCurrentUser();
  const coffees = user
    ? await listCoffees(supabase, user.id, { q, process, roastLevel, bagStatus })
    : [];
  const hasFilters = Boolean(q || process || roastLevel || bagStatus);
  const dict = getDictionary(await getLocale());
  const counts = shelfCounts(coffees);
  const shelfCount = dict.coffees.shelf.count
    .replace(
      "{coffees}",
      `${counts.coffees} ${counts.coffees === 1 ? dict.coffees.shelf.coffee : dict.coffees.shelf.coffees}`,
    )
    .replace("{bags}", `${counts.bags} ${counts.bags === 1 ? dict.coffees.bag : dict.coffees.bags}`);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-6 pt-7 md:px-8 md:py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">{dict.coffees.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{coffees.length ? shelfCount : dict.coffees.subtitle}</p>
        </div>
        <div className="flex gap-2">
          {/* Next to the library, because this is where you stand when you're
              thinking about the coffee rather than about the recipe. */}
          <Button href="/recipes" aria-label={dict.recipes.open} variant="secondary" className="w-11 px-0">
            <IconFavorita aria-hidden className="size-4" />
          </Button>
          <Button href="/inventory" aria-label={dict.coffees.inventory} variant="secondary" className="w-11 px-0">
            <IconArchivar aria-hidden className="size-4" />
          </Button>
          <Button href="/coffees/new" aria-label={dict.coffees.addCoffee}>
            <IconAnadir aria-hidden className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <CoffeeFilters />
      </div>

      <div className={coffees.length ? "mt-1" : "mt-6"}>
        {coffees.length ? (
          // Keyed on the filters so a new search starts again from the first
          // bag instead of keeping a position in a list that no longer exists.
          <CoffeeShelf key={`${q}|${process}|${roastLevel}|${bagStatus}`} coffees={coffees} />
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
