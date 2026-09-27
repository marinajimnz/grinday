import { notFound } from "next/navigation";
import { IconPerfil } from "@/components/icons/pencil-icons";
import { createClient } from "@/lib/supabase/server";
import { getMyFavourites, parseProfileKind, searchProfiles } from "@/features/profile/publicQueries";
import { SaveProfileButton } from "@/components/profile/SaveProfileButton";
import { ProfileSearchBox } from "@/components/profile/ProfileSearchBox";
import { ProfileRow } from "@/components/profile/ProfileRow";
import { BackButton } from "@/components/ui/BackButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

// Finds public people and roasters. Doesn't exist while the public side is
// off for the viewer — same as the profiles it would lead to.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: socialEnabled } = await supabase.rpc("social_enabled_for_me");
  if (!socialEnabled) notFound();

  const { q = "", tipo = "" } = await searchParams;
  const query = q.trim();
  const kind = parseProfileKind(tipo);
  const dict = getDictionary(await getLocale());
  const t = dict.search;
  const searchable = query.replace(/^@+/, "").length >= 2;
  const [results, favourites] = searchable
    ? await Promise.all([searchProfiles(supabase, query, kind), getMyFavourites(supabase)])
    : [[], []];
  const savedUsernames = new Set(favourites.flatMap((f) => (f.available ? [f.username] : [])));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center gap-2">
        <BackButton label={dict.publicProfile.back} />
        <h1 className="font-display text-2xl text-ink">{t.title}</h1>
      </div>

      <div className="mt-4">
        <ProfileSearchBox initialQuery={query} kind={tipo === "personas" || tipo === "tostadoras" ? tipo : ""} />
      </div>

      <div className="mt-6">
        {!searchable ? (
          <p className="text-sm text-ink-muted">{t.hint}</p>
        ) : results.length === 0 ? (
          <EmptyState icon={IconPerfil} title={t.noResultsTitle} description={t.noResults.replace("{query}", query)} />
        ) : (
          <ul className="space-y-2">
            {results.map((profile) => (
              <li key={profile.username}>
                <ProfileRow
                  username={profile.username}
                  displayName={profile.displayName}
                  kindLabel={
                    profile.accountType === "roaster"
                      ? dict.publicProfile.accountTypeRoaster
                      : dict.publicProfile.accountTypePerson
                  }
                  action={
                    <SaveProfileButton
                      username={profile.username}
                      initiallySaved={savedUsernames.has(profile.username)}
                    />
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
