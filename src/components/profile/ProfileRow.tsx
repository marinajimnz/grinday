import Link from "next/link";
import { ProfileAvatar } from "./ProfileAvatar";

// One profile in a list — search results and favourites. The name opens
// the profile; `action` (the save button) sits inside the card at the end.
export function ProfileRow({
  username,
  displayName,
  kind = "person",
  kindLabel,
  action,
}: {
  username: string;
  displayName: string | null;
  kind?: "person" | "roaster";
  kindLabel: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-16 items-center gap-2 rounded-card border border-border bg-surface pr-3">
      <Link
        href={`/u/${username}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-card py-3 pl-4 outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        <ProfileAvatar displayName={displayName} username={username} kind={kind} className="size-11 text-base" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{displayName ?? `@${username}`}</span>
          <span className="block truncate text-xs text-ink-muted">
            @{username} · {kindLabel}
          </span>
        </span>
      </Link>
      {action}
    </div>
  );
}
