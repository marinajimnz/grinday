import Link from "next/link";
import { notFound } from "next/navigation";
import { IconFavorita } from "@/components/icons/pencil-icons";
import { createClient } from "@/lib/supabase/server";
import { listFavouriteRecipes } from "@/features/attempts/queries";
import { RecipeCard } from "@/components/attempt/RecipeCard";
import { BackButton } from "@/components/ui/BackButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { getLocale } from "@/lib/i18n/locale";
import { formatRelativeDay } from "@/lib/i18n/format-date";
import { getDictionary } from "@/lib/i18n/get-dictionary";

// Every recipe you have starred, grouped by coffee. The dashboard shows one —
// the coffee you're drinking now — and this is the rest: a V60 recipe and a
// moka recipe for the same beans sit side by side here, which is the whole
// reason the star moved off the coffee and onto the attempt.
export default async function RecipesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.recipes;
  const groups = await listFavouriteRecipes(supabase, user.id);
  const count = groups.reduce((total, group) => total + group.recipes.length, 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center gap-2">
        <BackButton label={dict.publicProfile.back} />
        <h1 className="font-display text-2xl text-ink">{t.title}</h1>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        {count === 0
          ? t.subtitle
          : count === 1
            ? t.countOne
            : t.countMany.replace("{count}", String(count))}
      </p>

      {count === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={IconFavorita}
            title={t.emptyTitle}
            description={t.emptyDescription}
            action={
              <Button href="/coffees" variant="secondary" className="mt-2">
                {dict.nav.coffees}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((group) => (
            <section key={group.coffeeId}>
              <h2 className="text-lg font-semibold text-ink">
                <Link href={`/coffees/${group.coffeeId}`} className="underline-offset-4 hover:underline">
                  {group.coffeeName}
                </Link>
              </h2>
              <p className="text-sm text-ink-muted">{group.roaster}</p>

              <div className="mt-3 space-y-3">
                {group.recipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.attempt.id}
                    attempt={recipe.attempt}
                    coffeeId={group.coffeeId}
                    coffeeName={group.coffeeName}
                    roaster={group.roaster}
                    // Only read when there is a bag to brew from, which is
                    // exactly when this is not null.
                    targetBagId={recipe.targetBagId ?? ""}
                    userId={user.id}
                    brewable={group.brewable}
                    // The coffee is already the heading, so the card's caption
                    // is free to say what tells two of them apart. The method
                    // alone does not: two starred V60s read the same, and then
                    // the only difference is in numbers you have to compare.
                    label={`${
                      dict.equipment.methodLabels[
                        recipe.attempt.method as keyof typeof dict.equipment.methodLabels
                      ] ?? recipe.attempt.method
                    } · ${formatRelativeDay(recipe.brewedOn, locale, {
                      today: dict.dashboard.today,
                      yesterday: dict.dashboard.yesterday,
                    })}`}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
