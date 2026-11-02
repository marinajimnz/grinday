import Link from "next/link";
import { Bookmark, Search } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { IconAnadir, IconCafe, IconFavorita, IconFavorito } from "@/components/icons/pencil-icons";
import {
  getBestOfWeek,
  getDashboardAttempt,
  getDashboardRecipe,
  getRecentAttempts,
  hasAnyCoffee,
} from "@/features/dashboard/queries";
import { buildRecipeStack } from "@/features/dashboard/recipeStack";
import { countFavouriteRecipes } from "@/features/attempts/queries";
import { getMyPublicIdentity } from "@/features/profile/queries";
import { EmptyState } from "@/components/ui/EmptyState";
import { DraftResumeBanner } from "@/components/dashboard/DraftResumeBanner";
import { RecipeStack, type RecipeStackCard } from "@/components/dashboard/RecipeStack";
import { AttemptRow } from "@/components/dashboard/AttemptRow";
import { DashboardSnapshotWriter } from "@/components/dashboard/DashboardSnapshotWriter";
import { Button } from "@/components/ui/Button";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function DashboardPage() {
  const supabase = await createClient();
  const dict = getDictionary(await getLocale());

  const user = await getCurrentUser();

  // All in one go rather than waiting on hasAnyCoffee first: without a coffee
  // the recipe queries come back empty anyway, and that rare case isn't
  // worth a round-trip on every visit. The identity is the same cached call
  // the layout's VisibilityPromptGate makes, so it costs nothing extra.
  const [identity, hasCoffee, recipe, recentAttempts, favouriteCount, bestOfWeek] = user
    ? await Promise.all([
        getMyPublicIdentity(supabase, user.id),
        hasAnyCoffee(supabase, user.id),
        getDashboardRecipe(supabase, user.id),
        getRecentAttempts(supabase, user.id, 3, { excludeHiddenFromDashboard: true }),
        countFavouriteRecipes(supabase, user.id),
        getBestOfWeek(supabase, user.id),
      ])
    : [null, false, null, [], 0, null];
  const displayName = identity?.displayName;
  const socialEnabled = identity?.socialEnabled ?? false;

  const lastAttempt = recentAttempts[0];

  // The pinned recipe in the same shape as the others; it's usually one of
  // the attempts already loaded, so the extra query only runs when it isn't.
  const preferredId = hasCoffee && recipe?.isPreferred ? recipe.attempt.id : null;
  const preferred =
    preferredId && user
      ? ([lastAttempt, bestOfWeek].find((a) => a?.id === preferredId) ??
        (await getDashboardAttempt(supabase, user.id, preferredId)))
      : null;

  const stack: RecipeStackCard[] = buildRecipeStack({
    preferred,
    last: lastAttempt ?? null,
    best: bestOfWeek,
  }).map(({ kind, attempt }) =>
    kind === "preferred" && recipe
      ? {
          kind,
          attempt,
          recipe: {
            coffeeId: recipe.coffeeId,
            coffeeBagId: recipe.targetBagId,
            coffeeName: recipe.coffeeName,
            roaster: recipe.roaster,
            sourceAttempt: recipe.attempt,
          },
        }
      : { kind, attempt },
  );

  // Only when there's more to see than what's already in the pile: one
  // favourite that is the pinned card on top would lead back to itself.
  const showAllFavourites = favouriteCount > (preferred ? 1 : 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-3">
        {/* Smaller on a phone so the name, the heart and "grindaily" fit on
            one line next to the two buttons. */}
        <h1 className="flex min-w-0 flex-wrap items-center gap-x-1.5 font-display text-2xl break-words text-ink sm:gap-x-2 sm:text-4xl">
          {displayName ? (
            <>
              {displayName}
              <IconFavorito aria-hidden className="size-4 text-coffee sm:size-6" />
              grindaily
            </>
          ) : (
            dict.dashboard.title
          )}
        </h1>
        <div className="flex shrink-0 gap-2">
          {/* Only once the public side is on for this account: until then
              there's nobody to find. */}
          {socialEnabled && (
            <nav aria-label={dict.search.headerNav} className="flex gap-2">
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
          {hasCoffee && (
            <Button href="/brew/new" aria-label={dict.dashboard.newBrew} className="gap-1.5 px-3.5">
              <IconAnadir aria-hidden className="size-[18px]" />
              {dict.dashboard.newBrewShort}
            </Button>
          )}
        </div>
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
          <p className="mt-1 text-sm text-ink-muted">
            {stack.length ? dict.dashboard.pickRecipe : dict.dashboard.whatToday}
          </p>

          {lastAttempt && (
            <DashboardSnapshotWriter
              coffeeId={lastAttempt.coffee?.id ?? ""}
              coffeeName={lastAttempt.coffee?.name ?? ""}
              roaster={lastAttempt.coffee?.roaster ?? ""}
              lastAttemptNo={lastAttempt.attempt_no}
              lastAttemptRating={lastAttempt.overall_rating ?? undefined}
            />
          )}

          <div className="mt-4 space-y-4">
            {user && <DraftResumeBanner currentUserId={user.id} />}

            {stack.length > 0 && (
              <RecipeStack
                cards={stack}
                favouriteCount={showAllFavourites ? favouriteCount : null}
                userId={user?.id ?? ""}
              />
            )}

            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink">{dict.dashboard.recentBrews}</h2>
                <Link
                  href="/attempts"
                  className="-mr-3 inline-flex min-h-11 items-center px-3 text-sm font-medium text-ink-muted underline"
                >
                  {dict.dashboard.viewAll}
                </Link>
              </div>
              {recentAttempts.length ? (
                <ul>
                  {recentAttempts.map((attempt) => (
                    <li key={attempt.id}>
                      <AttemptRow attempt={attempt} compact />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">{dict.dashboard.noBrewsYet}</p>
              )}
              {showAllFavourites && (
                <Button href="/recipes" variant="secondary" fullWidth className="mt-3.5 min-h-12 bg-surface">
                  <IconFavorita aria-hidden className="size-4 text-coffee" />
                  {dict.dashboard.viewAllFavourites}
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
