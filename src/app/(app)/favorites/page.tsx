import { notFound } from "next/navigation";
import { IconFavorito, IconPerfil } from "@/components/icons/pencil-icons";
import { createClient } from "@/lib/supabase/server";
import { getMyFavourites, parseProfileKind } from "@/features/profile/publicQueries";
import { ProfileRow } from "@/components/profile/ProfileRow";
import { SaveProfileButton } from "@/components/profile/SaveProfileButton";
import { RemoveFavouriteButton } from "@/components/profile/RemoveFavouriteButton";
import { KindFilter } from "@/components/profile/KindFilter";
import { BackButton } from "@/components/ui/BackButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

// Your private list of saved profiles. Only you can see it; nobody on it
// is told. A profile that has gone private since stays listed — without a
// name — until you remove it.
export default async function FavoritesPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: socialEnabled } = await supabase.rpc("social_enabled_for_me");
  if (!socialEnabled) notFound();

  const { tipo = "" } = await searchParams;
  const current = tipo === "personas" || tipo === "tostadoras" ? tipo : "";
  const kind = parseProfileKind(current);

  const dict = getDictionary(await getLocale());
  const t = dict.favorites;
  const favourites = await getMyFavourites(supabase);
  // Unavailable ones have no kind any more; they show under "All" only.
  const shown =
    kind === "all" ? favourites : favourites.filter((f) => f.available && f.accountType === kind);
  const count = favourites.length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center gap-2">
        <BackButton label={dict.publicProfile.back} />
        <h1 className="font-display text-2xl text-ink">{t.title}</h1>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        {count === 0 ? t.subtitle : count === 1 ? t.countOne : t.count.replace("{count}", String(count))}
      </p>

      {count === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={IconFavorito}
            title={t.emptyTitle}
            description={t.emptyBody}
            action={
              <Button href="/search" variant="secondary" className="mt-2">
                {t.searchCta}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-4">
            <KindFilter
              basePath="/favorites"
              current={current}
              ariaLabel={dict.search.kindFilter}
              labels={{ all: dict.search.kindAll, people: dict.search.kindPeople, roasters: dict.search.kindRoasters }}
            />
          </div>
          {shown.length === 0 ? (
            <p className="mt-6 text-sm text-ink-muted">{t.noneOfKind}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {shown.map((favourite) => (
                <li key={favourite.bookmarkId}>
                  {favourite.available ? (
                    <ProfileRow
                      username={favourite.username}
                      displayName={favourite.displayName}
                      kind={favourite.accountType}
                      kindLabel={
                        favourite.accountType === "roaster"
                          ? dict.publicProfile.accountTypeRoaster
                          : dict.publicProfile.accountTypePerson
                      }
                      action={<SaveProfileButton username={favourite.username} initiallySaved refreshOnChange />}
                    />
                  ) : (
                    <div className="flex min-h-16 items-center gap-3 rounded-card border border-dashed border-border bg-surface py-3 pr-3 pl-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-muted">
                        <IconPerfil aria-hidden className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink-muted">{t.unavailableRow}</span>
                        <span className="block text-xs text-ink-muted">{t.unavailableHint}</span>
                      </span>
                      <RemoveFavouriteButton bookmarkId={favourite.bookmarkId} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
