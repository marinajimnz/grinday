import Link from "next/link";
import { IconPerfil } from "@/components/icons/pencil-icons";
import { FollowButton } from "./FollowButton";
import type { PublicProfile } from "@/features/profile/publicQueries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

export function ProfileHeader({
  profile,
  dict,
  followCounts,
  viewerId,
  isFollowing,
}: {
  profile: PublicProfile;
  dict: Dictionary;
  followCounts: { followers: number; following: number };
  viewerId: string | null;
  isFollowing: boolean;
}) {
  const isSelf = viewerId === profile.id;

  return (
    <header className="flex items-start gap-4">
      <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-canvas text-ink-muted">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar_url has no upload UI yet, so its shape (own storage vs. external) isn't settled
          <img src={profile.avatar_url} alt="" className="size-full object-cover" />
        ) : (
          <IconPerfil aria-hidden className="size-7" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-xl text-ink">
              {profile.display_name || `@${profile.username}`}
            </p>
            <p className="text-sm text-ink-muted">@{profile.username}</p>
          </div>
          {!isSelf && viewerId && (
            <FollowButton
              followeeId={profile.id}
              followeeUsername={profile.username}
              initialIsFollowing={isFollowing}
              dict={dict}
            />
          )}
        </div>

        {profile.bio && <p className="mt-2 text-sm text-ink">{profile.bio}</p>}

        <div className="mt-3 flex gap-4 text-sm">
          <Link href={`/u/${profile.username}/seguidores`}>
            <span className="font-semibold text-ink">{followCounts.followers}</span>{" "}
            <span className="text-ink-muted">{dict.profile.followersLabel}</span>
          </Link>
          <Link href={`/u/${profile.username}/siguiendo`}>
            <span className="font-semibold text-ink">{followCounts.following}</span>{" "}
            <span className="text-ink-muted">{dict.profile.followingLabel}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
