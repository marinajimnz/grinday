import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUsername } from "@/features/profile/publicQueries";
import { getFollowing, getFollowingIdsAmong } from "@/features/social/queries";
import { FollowListPage } from "@/components/profile/FollowListPage";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();
  const profile = await getProfileByUsername(supabase, username.toLowerCase());
  if (!profile) notFound();

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const following = await getFollowing(supabase, profile.id);
  const followingIds = viewer
    ? await getFollowingIdsAmong(
        supabase,
        viewer.id,
        following.map((f) => f.id),
      )
    : new Set<string>();

  const dict = getDictionary(await getLocale());

  return (
    <FollowListPage
      backHref={`/u/${profile.username}`}
      backLabel={`@${profile.username}`}
      title={dict.profile.followingTitle}
      items={following}
      followingIds={followingIds}
      viewerId={viewer?.id ?? null}
      emptyMessage={dict.profile.noFollowingYet}
      dict={dict}
    />
  );
}
