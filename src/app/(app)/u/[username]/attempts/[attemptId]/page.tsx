import Link from "next/link";
import { notFound } from "next/navigation";
import { IconCafe, IconFavorita, IconMolinillo } from "@/components/icons/pencil-icons";
import { METHOD_ICONS } from "@/features/equipment/methodIcons";
import { createClient } from "@/lib/supabase/server";
import { getPublicAttempt, isUuid } from "@/features/profile/publicQueries";
import { AttemptRecipeSummary } from "@/components/attempt/AttemptRecipeSummary";
import { StarRating } from "@/components/ui/StarRating";
import { BackButton } from "@/components/ui/BackButton";
import { TryRecipeButton } from "@/components/profile/TryRecipeButton";
import { formatDate } from "@/lib/i18n/format-date";
import type { BrewMethod } from "@/features/equipment/constants";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { titleFrom } from "@/lib/i18n/metadata";

export const generateMetadata = titleFrom((d) => d.pageTitles.attempt);

// One attempt on someone's public profile: its full setup — the same recipe
// block your own attempts show — the equipment it was brewed with, and its
// rating. Never the notes, photos or tasting scores (get_public_attempt()
// doesn't return them).
export default async function PublicAttemptPage({
  params,
}: {
  params: Promise<{ username: string; attemptId: string }>;
}) {
  const { username: rawUsername, attemptId } = await params;
  const username = decodeURIComponent(rawUsername).toLowerCase();
  if (!isUuid(attemptId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [attempt, { data: me }] = await Promise.all([
    getPublicAttempt(supabase, username, attemptId),
    supabase.from("profiles").select("username").eq("id", user.id).single(),
  ]);
  if (!attempt) notFound();
  const isMe = me?.username === username;

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.publicProfile;
  const [year, month, day] = attempt.brewedOn.split("-").map(Number);
  const methodName = dict.equipment.methodLabels[attempt.recipe.method as BrewMethod] ?? attempt.recipe.method;

  const equipment = [
    attempt.grinderModelName && { icon: IconMolinillo, label: t.grinder, value: attempt.grinderModelName },
    attempt.equipmentModelName && {
      icon: METHOD_ICONS[attempt.recipe.method as BrewMethod] ?? IconCafe,
      label: t.brewer,
      value: attempt.equipmentModelName,
    },
  ].filter(Boolean) as { icon: typeof IconMolinillo; label: string; value: string }[];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
      <BackButton label={t.back} fallbackHref={`/u/${username}/coffees/${attempt.coffeeId}`} />

      <header className="mt-2">
        {attempt.isPreferred && (
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-coffee uppercase">
            <IconFavorita aria-hidden className="size-4" />
            {t.preferredRecipe}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h1 className="font-display text-3xl text-ink">{methodName}</h1>
          {attempt.overallRating != null && <StarRating value={attempt.overallRating} />}
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          <Link href={`/u/${username}/coffees/${attempt.coffeeId}`} className="underline">
            {attempt.coffeeName} · {attempt.roaster}
          </Link>
          {" · "}
          {formatDate(new Date(year, month - 1, day), locale)}
          {" · "}
          <Link href={`/u/${username}`} className="underline">
            {t.byUser.replace("{username}", username)}
          </Link>
        </p>
      </header>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-ink">{t.configuration}</h2>
        <div className="mt-3">
          <AttemptRecipeSummary attempt={attempt.recipe} />
        </div>
      </section>

      {!isMe && <TryRecipeButton username={username} attemptId={attemptId} className="mt-6" />}

      {equipment.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-ink">{t.equipmentUsed}</h2>
          <ul className="mt-3 space-y-2">
            {equipment.map(({ icon: Icon, label, value }) => (
              <li
                key={label}
                className="flex min-h-12 items-center gap-3 rounded-card border border-border bg-surface px-4 py-2.5"
              >
                <Icon aria-hidden className="size-5 shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{value}</span>
                <span className="shrink-0 text-xs text-ink-muted">{label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
