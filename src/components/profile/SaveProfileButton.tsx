"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/cn";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { saveProfileAction, unsaveProfileAction } from "@/features/profile/favouriteActions";

// The bookmark that saves a profile to your private favourites. Flips at
// once and puts itself back if the server says no. Nobody is told either
// way — it isn't a follow.
export function SaveProfileButton({
  username,
  initiallySaved,
  refreshOnChange = false,
  className,
}: {
  username: string;
  initiallySaved: boolean;
  // On the favourites list, unsaving should drop the row.
  refreshOnChange?: boolean;
  className?: string;
}) {
  const t = useDictionary().favorites;
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !saved;
    setSaved(next);
    setError(null);
    startTransition(async () => {
      const result = next ? await saveProfileAction(username) : await unsaveProfileAction(username);
      if (!result.success) {
        setSaved(!next);
        setError(result.message);
        return;
      }
      if (refreshOnChange) router.refresh();
    });
  }

  const label = saved ? t.unsave : t.save;

  return (
    <span className={cn("inline-flex flex-col items-end", className)}>
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={saved}
        aria-label={label}
        title={label}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-input border border-border bg-surface text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        <Bookmark aria-hidden className={cn("size-5", saved && "fill-current")} />
      </button>
      {error && (
        <span role="alert" className="mt-1 max-w-48 text-right text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
