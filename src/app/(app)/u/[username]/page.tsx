import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getPublicCoffee,
  getPublicProfile,
  getPublicProfileContent,
  isProfileSaved,
} from "@/features/profile/publicQueries";
import { SaveProfileButton } from "@/components/profile/SaveProfileButton";
import {
  PublicAttemptsSection,
  PublicCoffeesSection,
  PublicEquipmentSection,
  RecommendedRecipeCard,
} from "@/components/profile/PublicProfileSections";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { OwnProfileBanner } from "@/components/profile/OwnProfileBanner";
import { BackButton } from "@/components/ui/BackButton";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

function countLabel(count: number, one: string, many: string) {
  return count === 1 ? one : many.replace("{count}", String(count));
}

// Another account's public profile. Everything on it comes from
// get_public_profile(), which answers a private, suspended or missing
// profile — or any profile while the public side is off for the viewer —
// with nothing at all; all of those are the same 404 here.
export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const profile = await getPublicProfile(supabase, decodeURIComponent(username));
  if (!profile) notFound();

  const [{ data: me }, content, saved] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    getPublicProfileContent(supabase, profile.username),
    isProfileSaved(supabase, profile.username),
  ]);
  const isMe = me?.username === profile.username;
  const isRoaster = profile.accountType === "roaster";

  // A roaster's recommended recipe: the preferred one of the first coffee
  // in its catalogue that has one (the list puts those first).
  const recommendedCoffee = isRoaster ? content.coffees.find((c) => c.hasRecipe) : undefined;
  const recommended = recommendedCoffee
    ? await getPublicCoffee(supabase, profile.username, recommendedCoffee.id).then((result) => {
        const attempt = result?.attempts.find((a) => a.isPreferred);
        return attempt ? { coffeeName: recommendedCoffee.name, attempt } : null;
      })
    : null;

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.publicProfile;
  const counts = [
    countLabel(profile.coffeesCount, t.coffeesOne, t.coffeesMany),
    countLabel(profile.recipesCount, t.recipesOne, t.recipesMany),
    countLabel(profile.attemptsCount, t.attemptsOne, t.attemptsMany),
  ].join(" · ");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-start justify-between gap-3">
        <BackButton label={t.back} />
        {!isMe && <SaveProfileButton username={profile.username} initiallySaved={saved} />}
      </div>

      {isMe && (
        <div className="mt-2">
          <OwnProfileBanner />
        </div>
      )}

      <header className="mt-4">
        <ProfileAvatar
          displayName={profile.displayName}
          username={profile.username}
          kind={profile.accountType}
          className="size-20 text-3xl"
        />
        <h1 className="mt-4 font-display text-3xl break-words text-ink text-balance">
          {profile.displayName ?? `@${profile.username}`}
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">@{profile.username}</p>
        {isRoaster && (
          <span className="mt-2 inline-flex rounded-full bg-canvas px-3 py-1 text-xs font-medium text-ink">
            {t.accountTypeRoaster}
          </span>
        )}
        {profile.bio && <p className="mt-3 max-w-prose text-sm whitespace-pre-line text-ink">{profile.bio}</p>}
        <p className="mt-3 text-sm text-ink-muted tabular-nums">
          {isRoaster ? countLabel(profile.coffeesCount, t.catalogOne, t.catalogMany) : counts}
        </p>
      </header>

      {isRoaster ? (
        <>
          <PublicCoffeesSection coffees={content.coffees} username={profile.username} dict={dict} asRoaster />
          {recommended && (
            <RecommendedRecipeCard
              coffeeName={recommended.coffeeName}
              attempt={recommended.attempt}
              username={profile.username}
              canTry={!isMe}
              dict={dict}
            />
          )}
        </>
      ) : (
        <>
          <PublicCoffeesSection coffees={content.coffees} username={profile.username} dict={dict} />
          <PublicEquipmentSection equipment={content.equipment} dict={dict} />
          <PublicAttemptsSection attempts={content.attempts} username={profile.username} dict={dict} locale={locale} />
        </>
      )}
    </div>
  );
}
