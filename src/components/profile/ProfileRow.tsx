import Link from "next/link";
import { ProfileAvatar } from "./ProfileAvatar";

// One profile in a list — search results now, favourites later. The whole
// row opens the profile.
export function ProfileRow({
  username,
  displayName,
  kindLabel,
}: {
  username: string;
  displayName: string | null;
  kindLabel: string;
}) {
  return (
    <Link
      href={`/u/${username}`}
      className="flex min-h-16 items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      <ProfileAvatar displayName={displayName} username={username} className="size-11 text-base" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{displayName ?? `@${username}`}</span>
        <span className="block truncate text-xs text-ink-muted">
          @{username} · {kindLabel}
        </span>
      </span>
    </Link>
  );
}
