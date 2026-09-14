import Link from "next/link";
import { IconPerfil } from "@/components/icons/pencil-icons";
import { FollowButton } from "./FollowButton";
import type { FollowProfileSummary } from "@/features/social/queries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

export function FollowListItem({
  profile,
  isFollowing,
  isSelf,
  dict,
}: {
  profile: FollowProfileSummary;
  isFollowing: boolean;
  isSelf: boolean;
  dict: Dictionary;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-3">
      <Link href={`/u/${profile.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-canvas text-ink-muted">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- see ProfileHeader
            <img src={profile.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            <IconPerfil aria-hidden className="size-5" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">
            {profile.display_name || `@${profile.username}`}
          </span>
          <span className="block truncate text-xs text-ink-muted">@{profile.username}</span>
        </span>
      </Link>
      {!isSelf && (
        <FollowButton
          followeeId={profile.id}
          followeeUsername={profile.username}
          initialIsFollowing={isFollowing}
          dict={dict}
        />
      )}
    </div>
  );
}
