"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClassName } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { followUserAction, unfollowUserAction } from "@/features/social/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

export function FollowButton({
  followeeId,
  followeeUsername,
  initialIsFollowing,
  dict,
  className,
}: {
  followeeId: string;
  followeeUsername: string;
  initialIsFollowing: boolean;
  dict: Dictionary;
  className?: string;
}) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = !isFollowing;
    setIsFollowing(next);
    setError(null);
    startTransition(async () => {
      const result = next
        ? await followUserAction(followeeId, followeeUsername)
        : await unfollowUserAction(followeeId, followeeUsername);
      if (!result.success) {
        setIsFollowing(!next);
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className={cn(buttonClassName(isFollowing ? "secondary" : "primary"), className)}
      >
        {isFollowing ? dict.profile.following : dict.profile.follow}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
