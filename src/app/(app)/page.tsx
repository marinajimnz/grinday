import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconCafe, IconFavorito } from "@/components/icons/pencil-icons";
import { getDashboardOverview, getRecentAttempts, hasAnyCoffee } from "@/features/dashboard/queries";
import { EmptyState } from "@/components/ui/EmptyState";
import { NewBrewCta } from "@/components/dashboard/NewBrewCta";
import { DraftResumeBanner } from "@/components/dashboard/DraftResumeBanner";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { RecentAttemptsList } from "@/components/dashboard/RecentAttemptsList";
import { DashboardSnapshotWriter } from "@/components/dashboard/DashboardSnapshotWriter";
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

  const hasCoffee = await hasAnyCoffee(supabase);

  const [overview, recentAttempts] = hasCoffee
    ? await Promise.all([
        getDashboardOverview(supabase),
        getRecentAttempts(supabase, 4, { excludeHiddenFromDashboard: true }),
      ])
    : [null, []];

  const lastAttempt = recentAttempts[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="flex items-center gap-2 font-display text-4xl text-ink">
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
                <Link
                  href="/coffees/new"
                  className="mt-2 inline-flex min-h-11 items-center rounded-input bg-ink px-4 text-sm font-medium text-surface"
                >
                  {dict.dashboard.addCoffee}
                </Link>
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

            <DashboardStats
              totalBrews={overview?.totalBrews ?? 0}
              avgRating={overview?.avgRating ?? null}
              favoriteMethod={overview?.favoriteMethod ?? null}
            />

            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink">{dict.dashboard.recentBrews}</h2>
                <Link href="/attempts" className="text-sm font-medium text-ink-muted underline">
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
