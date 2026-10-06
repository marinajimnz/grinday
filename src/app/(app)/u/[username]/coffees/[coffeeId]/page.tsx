import Link from "next/link";
import { notFound } from "next/navigation";
import { IconCafe } from "@/components/icons/pencil-icons";
import { createClient } from "@/lib/supabase/server";
import { getPublicCoffee, isUuid } from "@/features/profile/publicQueries";
import { CoffeeFacts } from "@/components/coffee/CoffeeFacts";
import { PublicAttemptRow } from "@/components/profile/PublicProfileSections";
import { BackButton } from "@/components/ui/BackButton";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { titleFrom } from "@/lib/i18n/metadata";

export const generateMetadata = titleFrom((d) => d.pageTitles.coffee);

// A coffee on someone's public profile: what it is (origin, process,
// roast, tasting notes) and how they've brewed it — its preferred recipe
// up top when there is one, then the latest four attempts. Everything comes
// from get_public_coffee() and get_public_coffee_attempts(); a coffee the
// viewer can't see is the same not-found as a missing profile.
export default async function PublicCoffeePage({
  params,
}: {
  params: Promise<{ username: string; coffeeId: string }>;
}) {
  const { username: rawUsername, coffeeId } = await params;
  const username = decodeURIComponent(rawUsername).toLowerCase();
  if (!isUuid(coffeeId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const result = await getPublicCoffee(supabase, username, coffeeId);
  if (!result) notFound();
  const { coffee, attempts } = result;

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.publicProfile;

  const preferred = attempts.find((a) => a.isPreferred) ?? null;
  // The database adds the preferred recipe to the latest four when it's
  // older than them; then it only shows in its own card, not in the list.
  const latest = attempts.length > 4 ? attempts.filter((a) => !a.isPreferred) : attempts;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
      <BackButton label={t.back} fallbackHref={`/u/${username}`} />

      <div className="mt-2 rounded-card border border-border bg-surface p-5">
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-input bg-canvas">
            <IconCafe aria-hidden className="size-7 text-coffee" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-ink-muted">{coffee.roaster}</p>
            <h1 className="font-display text-2xl break-words text-ink">{coffee.name}</h1>
            <Link href={`/u/${username}`} className="text-sm text-ink-muted underline">
              {t.byUser.replace("{username}", username)}
            </Link>
          </div>
        </div>
        <CoffeeFacts coffee={coffee} dict={dict} />
      </div>

      {preferred && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-ink">{t.preferredRecipe}</h2>
          <div className="mt-3">
            <PublicAttemptRow
              attempt={preferred}
              username={username}
              highlighted
              preferredLabel={false}
              dict={dict}
              locale={locale}
            />
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">{t.attemptsOnCoffee}</h2>
        {latest.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">{t.noAttemptsOnCoffee}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {latest.map((attempt) => (
              <li key={attempt.id}>
                <PublicAttemptRow
                  attempt={attempt}
                  username={username}
                  highlighted={attempt.isPreferred}
                  dict={dict}
                  locale={locale}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
