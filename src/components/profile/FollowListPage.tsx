import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FollowListItem } from "./FollowListItem";
import type { FollowProfileSummary } from "@/features/social/queries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

// Shared layout for both /u/[username]/seguidores and /siguiendo — same
// shape (back link, title, list of profiles with an inline follow button
// each), different data source.
export function FollowListPage({
  backHref,
  backLabel,
  title,
  items,
  followingIds,
  viewerId,
  emptyMessage,
  dict,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  items: FollowProfileSummary[];
  followingIds: Set<string>;
  viewerId: string | null;
  emptyMessage: string;
  dict: Dictionary;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-ink-muted">
        <ChevronLeft aria-hidden className="size-4" />
        {backLabel}
      </Link>
      <h1 className="mt-4 font-display text-xl text-ink">{title}</h1>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((profile) => (
            <li key={profile.id}>
              <FollowListItem
                profile={profile}
                isFollowing={followingIds.has(profile.id)}
                isSelf={viewerId === profile.id}
                dict={dict}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
