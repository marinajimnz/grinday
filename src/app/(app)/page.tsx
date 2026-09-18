import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconCafe, IconFavorito, IconPreparar } from "@/components/icons/pencil-icons";
import { getDashboardRecipe, getRecentAttempts, hasAnyCoffee } from "@/features/dashboard/queries";
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

  const hasCoffee = user ? await hasAnyCoffee(supabase, user.id) : false;

  const [recipe, recentAttempts] =
    hasCoffee && user
      ? await Promise.all([
          getDashboardRecipe(supabase, user.id),
          getRecentAttempts(supabase, user.id, 4, { excludeHiddenFromDashboard: true }),
        ])
      : [null, []];

  const lastAttempt = recentAttempts[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="flex flex-wrap items-center gap-x-2 font-display text-4xl break-words text-ink">
        {profile?.display_name ? (
          <>
            {profile.display_name}
            <IconFavorito aria-hidden className="size-6 text-coffee" />
            grindaily
          </>
        ) : (
          dict.dashboard.title
        )}
      </h1>

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
