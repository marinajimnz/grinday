import Link from "next/link";
import { Bookmark, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { IconCafe, IconFavorito, IconPreparar } from "@/components/icons/pencil-icons";
import { getDashboardRecipe, getRecentAttempts, hasAnyCoffee } from "@/features/dashboard/queries";
import { countFavouriteRecipes } from "@/features/attempts/queries";
import { EmptyState } from "@/components/ui/EmptyState";
import { NewBrewCta } from "@/components/dashboard/NewBrewCta";
import { DraftResumeBanner } from "@/components/dashboard/DraftResumeBanner";
import { RecipeCard } from "@/components/attempt/RecipeCard";
import { RecentAttemptsList } from "@/components/dashboard/RecentAttemptsList";
import { DashboardSnapshotWriter } from "@/components/dashboard/DashboardSnapshotWriter";
import { Button } from "@/components/ui/Button";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function DashboardPage() {
  const supabase = await createClient();
  const dict = getDictionary(await getLocale());

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("display_name").eq("id", user.id).single()
    : { data: null };

  const [hasCoffee, { data: socialEnabled }] = await Promise.all([
    user ? hasAnyCoffee(supabase, user.id) : Promise.resolve(false),
    supabase.rpc("social_enabled_for_me"),
  ]);

  const [recipe, recentAttempts, favouriteCount] =
    hasCoffee && user
      ? await Promise.all([
          getDashboardRecipe(supabase, user.id),
          getRecentAttempts(supabase, user.id, 4, { excludeHiddenFromDashboard: true }),
          countFavouriteRecipes(supabase, user.id),
        ])
      : [null, [], 0];

  const lastAttempt = recentAttempts[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-3">
        {/* Smaller on a phone so the name, the heart and "grindaily" fit on
            one line next to the two buttons. */}
        <h1 className="flex min-w-0 flex-wrap items-center gap-x-1.5 font-display text-2xl break-words text-ink sm:gap-x-2 sm:text-4xl">
          {profile?.display_name ? (
            <>
              {profile.display_name}
              <IconFavorito aria-hidden className="size-4 text-coffee sm:size-6" />
              grindaily
            </>
          ) : (
            dict.dashboard.title
          )}
        </h1>
        {/* Only once the public side is on for this account: until then
            there's nobody to find. */}
        {socialEnabled && (
          <nav aria-label={dict.search.headerNav} className="flex shrink-0 gap-2">
            <Link
              href="/search"
              aria-label={dict.search.openSearch}
              className="inline-flex size-11 items-center justify-center rounded-input border border-border bg-surface text-ink"
            >
              <Search aria-hidden className="size-5" />
            </Link>
            <Link
              href="/favorites"
              aria-label={dict.favorites.open}
              className="inline-flex size-11 items-center justify-center rounded-input border border-border bg-surface text-ink"
            >
              <Bookmark aria-hidden className="size-5" />
            </Link>
          </nav>
        )}
      </div>

      {!hasCoffee ? (
        <>
          <p className="mt-1 text-sm text-ink-muted">{dict.dashboard.subtitle}</p>
          <div className="mt-8">
            <EmptyState
              icon={IconCafe}
              title={dict.dashboard.emptyTitle}
              description={dict.dashboard.emptyDescription}
              action={
                <Button href="/coffees/new" className="mt-2">
                  {dict.dashboard.addCoffee}
                </Button>
              }
            />
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-muted">{dict.dashboard.whatToday}</p>

          {lastAttempt && (
            <DashboardSnapshotWriter
              coffeeId={lastAttempt.coffee?.id ?? ""}
              coffeeName={lastAttempt.coffee?.name ?? ""}
              roaster={lastAttempt.coffee?.roaster ?? ""}
              lastAttemptNo={lastAttempt.attempt_no}
              lastAttemptRating={lastAttempt.overall_rating ?? undefined}
            />
          )}

          <div className="mt-6 space-y-6">
            {user && <DraftResumeBanner currentUserId={user.id} />}

            <NewBrewCta />

            {recipe && (
              <div>
                <RecipeCard
                  attempt={recipe.attempt}
                  coffeeId={recipe.coffeeId}
                  coffeeName={recipe.coffeeName}
                  roaster={recipe.roaster}
                  targetBagId={recipe.targetBagId}
                  userId={user?.id ?? ""}
                  label={recipe.isPreferred ? undefined : dict.dashboard.lastAttempt}
                  icon={recipe.isPreferred ? undefined : IconPreparar}
                />

                {/* Only when there is more to see than what's already on screen:
                    the card itself is one favourite when it is starred, none when
                    it's standing in for one. */}
                {favouriteCount > (recipe.isPreferred ? 1 : 0) && (
                  <div className="flex justify-end">
                    <Link
                      href="/recipes"
                      className="-mr-3 inline-flex min-h-11 items-center px-3 text-sm font-medium text-ink-muted underline"
                    >
                      {dict.recipes.viewAll}
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink">{dict.dashboard.recentBrews}</h2>
                <Link
                  href="/attempts"
                  className="-mr-3 inline-flex min-h-11 items-center px-3 text-sm font-medium text-ink-muted underline"
                >
                  {dict.dashboard.viewAll}
                </Link>
              </div>
              <div className="mt-3">
                <RecentAttemptsList attempts={recentAttempts} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
