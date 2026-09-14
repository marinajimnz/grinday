import Link from "next/link";
import { UserSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { searchProfiles } from "@/features/profile/publicQueries";
import { getFollowingIdsAmong } from "@/features/social/queries";
import { FollowListItem } from "@/components/profile/FollowListItem";
import { ProfileSearchInput } from "@/components/profile/ProfileSearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const page = typeof params.page === "string" ? Math.max(0, parseInt(params.page, 10) || 0) : 0;

  const supabase = await createClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const { results, hasMore } = await searchProfiles(supabase, q, page);
  const followingIds = viewer
    ? await getFollowingIdsAmong(
        supabase,
        viewer.id,
        results.map((r) => r.id),
      )
    : new Set<string>();

  const dict = getDictionary(await getLocale());

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">{dict.search.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{dict.search.subtitle}</p>

      <div className="mt-6">
        <ProfileSearchInput />
      </div>

      <div className="mt-6">
        {!q.trim() ? (
          <p className="text-sm text-ink-muted">{dict.search.prompt}</p>
        ) : results.length ? (
          <>
            <ul className="space-y-2">
              {results.map((profile) => (
                <li key={profile.id}>
                  <FollowListItem
                    profile={profile}
                    isFollowing={followingIds.has(profile.id)}
                    isSelf={viewer?.id === profile.id}
                    dict={dict}
                  />
                </li>
              ))}
            </ul>

            {(page > 0 || hasMore) && (
              <div className="mt-4 flex justify-between text-sm">
                {page > 0 ? (
                  <Link href={`/search?q=${encodeURIComponent(q)}&page=${page - 1}`} className="text-ink">
                    {dict.common.back}
                  </Link>
                ) : (
                  <span />
                )}
                {hasMore && (
                  <Link href={`/search?q=${encodeURIComponent(q)}&page=${page + 1}`} className="text-ink">
                    {dict.common.next}
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={UserSearch}
            title={dict.search.noResultsTitle}
            description={dict.search.noResultsDescription}
          />
        )}
      </div>
    </div>
  );
}
